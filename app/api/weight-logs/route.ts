import { getServerSession } from "next-auth/next"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

const bodySchema = z.object({
  weightKg: z.number().min(25).max(350),
  date: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response("Unauthorized", { status: 403 })

    const body = bodySchema.parse(await req.json())
    const log = await db.weightLog.create({
      data: {
        userId: session.user.id,
        weightKg: body.weightKg,
        date: body.date ? new Date(body.date) : new Date(),
      },
      select: { id: true, weightKg: true, date: true },
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
    const days = Number(url.searchParams.get("days") ?? "30")
    const safeDays = Number.isFinite(days) ? Math.min(Math.max(days, 1), 365) : 30

    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
    const startDate = new Date(endDate)
    startDate.setDate(endDate.getDate() - safeDays + 1)
    startDate.setHours(0, 0, 0, 0)

    const logs = await db.weightLog.findMany({
      where: { userId: session.user.id, date: { gte: startDate, lte: endDate } },
      select: { id: true, weightKg: true, date: true },
      orderBy: { date: "asc" },
    })
    return Response.json(logs)
  } catch {
    return new Response(null, { status: 500 })
  }
}
