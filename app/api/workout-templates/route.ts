import { getServerSession } from "next-auth/next"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

const exerciseSchema = z.object({
  name: z.string().min(1).max(100),
  sets: z.number().int().min(1).max(20),
  reps: z.string().max(20),           // "10" or "12-15" or "40秒"
  notes: z.string().max(100).optional(),
  isCardio: z.boolean().optional(),
  cardioMin: z.number().int().min(1).max(300).optional(),
})

const bodySchema = z.object({
  name: z.string().min(1).max(100),
  cycleDay: z.number().int().min(1).max(10).optional(),
  exercises: z.array(exerciseSchema).min(1).max(30),
  sortOrder: z.number().int().optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response("Unauthorized", { status: 403 })

    const templates = await db.workoutTemplate.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, cycleDay: true, exercises: true, sortOrder: true, createdAt: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    })
    return Response.json(templates)
  } catch {
    return new Response(null, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response("Unauthorized", { status: 403 })

    const body = bodySchema.parse(await req.json())
    const template = await db.workoutTemplate.create({
      data: {
        userId: session.user.id,
        name: body.name,
        cycleDay: body.cycleDay,
        exercises: body.exercises,
        sortOrder: body.sortOrder ?? 0,
      },
      select: { id: true, name: true, cycleDay: true, exercises: true, sortOrder: true },
    })
    return Response.json(template)
  } catch (error) {
    if (error instanceof z.ZodError) return new Response(JSON.stringify(error.issues), { status: 422 })
    return new Response(null, { status: 500 })
  }
}
