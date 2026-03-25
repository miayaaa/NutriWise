import { db } from "@/lib/db"

export interface DailyKcal {
  date: string   // YYYY-MM-DD
  kcal: number   // 0 if not logged
  logged: boolean
}

export interface WeeklyStats {
  avgKcalPerLoggedDay: number   // avg kcal on days food was logged (not zero-filling)
  daysLoggedFood: number        // days with at least 1 food log in last 7
  workoutDaysThisWeek: number   // days with a workout in last 7
  totalWorkoutMinThisWeek: number
  foodStreak: number            // consecutive days ending today (or yesterday) with food logs
  workoutStreak: number         // consecutive days ending today (or yesterday) with workouts
  dailyKcal: DailyKcal[]        // 7-day array sun→sat for sparkline, index 0 = oldest
}

function calcStreak(dateSortedDesc: string[], todayStr: string): number {
  const seen = new Set<string>()
  const unique = dateSortedDesc.filter(d => d && !seen.has(d) && seen.add(d)).sort().reverse()
  let streak = 0
  let cursor = todayStr
  for (const d of unique) {
    if (d === cursor) {
      streak++
      const dt = new Date(cursor + "T00:00:00Z")
      dt.setUTCDate(dt.getUTCDate() - 1)
      cursor = dt.toISOString().split("T")[0]
    } else if (d < cursor) {
      // gap — streak ends
      break
    }
  }
  return streak
}

export async function getWeeklyStats(userId: string): Promise<WeeklyStats> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split("T")[0]

  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 6)

  // 90 days back for streak calculation (handles any realistic streak)
  const ninetyDaysAgo = new Date(today)
  ninetyDaysAgo.setDate(today.getDate() - 89)

  const [weekFoodLogs, weekWorkouts, allFoodDates, allWorkoutDates] = await Promise.all([
    db.foodLog.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
      select: { localDate: true, aiCalories: true },
    }),
    db.workoutLog.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
      select: { date: true, durationMin: true },
    }),
    db.foodLog.findMany({
      where: { userId, date: { gte: ninetyDaysAgo } },
      select: { localDate: true },
    }),
    db.workoutLog.findMany({
      where: { userId, date: { gte: ninetyDaysAgo } },
      select: { date: true },
    }),
  ])

  // Weekly food stats
  const kcalByDay = new Map<string, number>()
  for (const log of weekFoodLogs) {
    const d = log.localDate ?? todayStr
    kcalByDay.set(d, (kcalByDay.get(d) ?? 0) + (log.aiCalories ?? 0))
  }
  const daysLoggedFood = kcalByDay.size
  const totalKcal = Array.from(kcalByDay.values()).reduce((s, v) => s + v, 0)
  const avgKcalPerLoggedDay = daysLoggedFood > 0 ? Math.round(totalKcal / daysLoggedFood) : 0

  // Weekly workout stats
  const workoutDaySet = new Set(workouts_thisWeek_dates(weekWorkouts))
  const workoutDaysThisWeek = workoutDaySet.size
  const totalWorkoutMinThisWeek = weekWorkouts.reduce((s, w) => s + w.durationMin, 0)

  // Streaks (90-day window)
  const foodDatesDesc = allFoodDates
    .map(f => f.localDate ?? "")
    .filter(Boolean)
  const workoutDatesDesc = allWorkoutDates
    .map(w => w.date.toISOString().split("T")[0])

  const foodStreak = calcStreak(foodDatesDesc, todayStr)
  const workoutStreak = calcStreak(workoutDatesDesc, todayStr)

  // Build 7-day daily kcal array (oldest → newest)
  const dailyKcal: DailyKcal[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = d.toISOString().split("T")[0]
    const kcal = kcalByDay.get(dateStr) ?? 0
    dailyKcal.push({ date: dateStr, kcal: Math.round(kcal), logged: kcalByDay.has(dateStr) })
  }

  return {
    avgKcalPerLoggedDay,
    daysLoggedFood,
    workoutDaysThisWeek,
    totalWorkoutMinThisWeek,
    foodStreak,
    workoutStreak,
    dailyKcal,
  }
}

function workouts_thisWeek_dates(logs: { date: Date }[]): string[] {
  return logs.map(w => w.date.toISOString().split("T")[0])
}
