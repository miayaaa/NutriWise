import { getServerSession } from "next-auth/next"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

const bodySchema = z.object({
  waistCm: z.number().min(30).max(250).optional(),
  hipCm: z.number().min(30).max(300).optional(),
  feelScore: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(200).optional(),
  date: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response("Unauthorized", { status: 403 })

    const body = bodySchema.parse(await req.json())
    if (!body.waistCm && !body.hipCm && !body.feelScore && !body.notes) {
      return new Response("At least one field required", { status: 422 })
    }

    const log = await db.bodyMeasurement.create({
      data: {
        userId: session.user.id,
        waistCm: body.waistCm,
        hipCm: body.hipCm,
        feelScore: body.feelScore,
        notes: body.notes,
        date: body.date ? new Date(body.date) : new Date(),
      },
      select: { id: true, waistCm: true, hipCm: true, feelScore: true, notes: true, date: true },
    })
    return Response.json(log)
  } catch (error) {
    if (error instanceof z.ZodError) return new Response(JSON.stringify(error.issues), { status: 422 })
    return new Response(null, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response("Unauthorized", { status: 403 })

    const url = new URL(req.url)
    const days = Number(url.searchParams.get("days") ?? "90")
    const safeDays = Number.isFinite(days) ? Math.min(Math.max(days, 1), 365) : 90

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - safeDays + 1)
    startDate.setHours(0, 0, 0, 0)

    const logs = await db.bodyMeasurement.findMany({
      where: { userId: session.user.id, date: { gte: startDate } },
      select: { id: true, waistCm: true, hipCm: true, feelScore: true, notes: true, date: true },
      orderBy: { date: "asc" },
    })
    return Response.json(logs)
  } catch {
    return new Response(null, { status: 500 })
  }
}
