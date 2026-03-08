import { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth/next"
import { z } from "zod"

import { generateWorkoutComment } from "@/lib/ai/workout"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

const strengthContextSchema = z.object({
  mode: z.literal("strength"),
  strength: z.object({
    exercise: z.string().min(1).max(100),
    sets: z.number().int().min(1).max(50),
    reps: z.number().int().min(1).max(200),
    weightKg: z.number().min(0).max(2000).optional(),
    restSec: z.number().int().min(0).max(1200).optional(),
  }),
})

const cardioContextSchema = z.object({
  mode: z.literal("cardio"),
  cardio: z.object({
    cardioType: z.string().min(1).max(100),
    distanceKm: z.number().min(0).max(1000).optional(),
    avgSpeedKph: z.number().min(0).max(120).optional(),
    inclinePct: z.number().min(0).max(60).optional(),
    elevationGainM: z.number().min(0).max(20000).optional(),
  }),
})

const otherContextSchema = z.object({
  mode: z.literal("other"),
  other: z.object({
    workoutName: z.string().min(1).max(100),
  }),
})

const analysisContextSchema = z.discriminatedUnion("mode", [
  strengthContextSchema,
  cardioContextSchema,
  otherContextSchema,
])

const bodySchema = z.object({
  type: z.string().min(1).max(100),
  durationMin: z.number().int().min(1).max(600),
  notes: z.string().max(500).optional(),
  analysisContext: analysisContextSchema.optional(),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response("Unauthorized", { status: 403 })

    const body = bodySchema.parse(await req.json())
    const aiComment = await generateWorkoutComment(
      body.type,
      body.durationMin,
      body.notes,
      body.analysisContext
    )

    let log
    try {
      log = await db.workoutLog.create({
        data: {
          userId: session.user.id,
          type: body.type,
          durationMin: body.durationMin,
          details: body.analysisContext as Prisma.InputJsonValue | undefined,
          notes: body.notes,
          aiComment,
        },
        select: { id: true, type: true, durationMin: true, details: true, notes: true, aiComment: true, date: true },
      })
    } catch {
      const legacyLog = await db.workoutLog.create({
        data: {
          userId: session.user.id,
          type: body.type,
          durationMin: body.durationMin,
          notes: body.notes,
          aiComment,
        },
        select: { id: true, type: true, durationMin: true, notes: true, aiComment: true, date: true },
      })
      log = { ...legacyLog, details: null }
    }
    return Response.json(log)
  } catch (error) {
    if (error instanceof z.ZodError) return new Response(JSON.stringify(error.issues), { status: 422 })
    return new Response(null, { status: 500 })
  }
}
