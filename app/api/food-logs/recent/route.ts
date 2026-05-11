import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return new Response("Unauthorized", { status: 403 })

  // Scan recent 120 logs, rank by frequency then recency
  const logs = await db.foodLog.findMany({
    where: { userId: session.user.id },
    select: {
      foodDescription: true,
      mealType: true,
      aiCalories: true,
      protein: true,
      carbs: true,
      fat: true,
      aiComment: true,
    },
    orderBy: { date: "desc" },
    take: 120,
  })

  const freq = new Map<string, { count: number; data: typeof logs[0] }>()
  for (const l of logs) {
    if (!l.foodDescription) continue
    const existing = freq.get(l.foodDescription)
    if (existing) {
      existing.count++
    } else {
      freq.set(l.foodDescription, { count: 1, data: l })
    }
  }

  const unique = Array.from(freq.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((e) => e.data)

  return Response.json(unique)
}
