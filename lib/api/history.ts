import { db } from "@/lib/db"

export async function getFoodHistory(userId: string, days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  since.setHours(0, 0, 0, 0)

  const logs = await db.foodLog.findMany({
    where: { userId, date: { gte: since } },
    select: {
      id: true,
      date: true,
      mealType: true,
      foodDescription: true,
      aiCalories: true,
      protein: true,
      carbs: true,
      fat: true,
    },
    orderBy: { date: "desc" },
  })

  // Group by calendar date
  const map = new Map<string, typeof logs>()
  for (const log of logs) {
    const key = log.date.toISOString().split("T")[0]
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(log)
  }

  return Array.from(map.entries()).map(([date, meals]) => ({
    date,
    meals,
    totalCalories: meals.reduce((s, m) => s + (m.aiCalories ?? 0), 0),
    totalProtein:  meals.reduce((s, m) => s + (m.protein  ?? 0), 0),
    totalCarbs:    meals.reduce((s, m) => s + (m.carbs    ?? 0), 0),
    totalFat:      meals.reduce((s, m) => s + (m.fat      ?? 0), 0),
  }))
}
