import { getServerSession } from "next-auth/next"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

const exerciseSchema = z.object({
  name: z.string().min(1).max(100),
  sets: z.number().int().min(1).max(20),
  reps: z.string().max(20),
  notes: z.string().max(100).optional(),
  isCardio: z.boolean().optional(),
  cardioMin: z.number().int().min(1).max(300).optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  cycleDay: z.number().int().min(1).max(10).nullable().optional(),
  exercises: z.array(exerciseSchema).min(1).max(30).optional(),
  sortOrder: z.number().int().optional(),
})

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response("Unauthorized", { status: 403 })

    const existing = await db.workoutTemplate.findUnique({ where: { id: params.id } })
    if (!existing || existing.userId !== session.user.id) return new Response(null, { status: 404 })

    const body = updateSchema.parse(await req.json())
    const updated = await db.workoutTemplate.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.cycleDay !== undefined && { cycleDay: body.cycleDay }),
        ...(body.exercises !== undefined && { exercises: body.exercises }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
      select: { id: true, name: true, cycleDay: true, exercises: true, sortOrder: true },
    })
    return Response.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) return new Response(JSON.stringify(error.issues), { status: 422 })
    return new Response(null, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response("Unauthorized", { status: 403 })

    const template = await db.workoutTemplate.findUnique({ where: { id: params.id } })
    if (!template || template.userId !== session.user.id) return new Response(null, { status: 404 })

    await db.workoutTemplate.delete({ where: { id: params.id } })
    return new Response(null, { status: 204 })
  } catch {
    return new Response(null, { status: 500 })
  }
}
