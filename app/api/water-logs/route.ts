import { getServerSession } from "next-auth/next"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

const bodySchema = z.object({
  amount: z.number().int().min(1).max(2000),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response("Unauthorized", { status: 403 })

    const body = bodySchema.parse(await req.json())
    const log = await db.waterLog.create({
      data: { userId: session.user.id, amount: body.amount },
      select: { id: true, amount: true, date: true },
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

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const logs = await db.waterLog.findMany({
      where: { userId: session.user.id, date: { gte: today, lte: todayEnd } },
      select: { id: true, amount: true, date: true },
      orderBy: { date: "asc" },
    })
    return Response.json(logs)
  } catch {
    return new Response(null, { status: 500 })
  }
}
