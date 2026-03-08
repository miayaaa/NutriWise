import { db } from "@/lib/db"
import { getUserActivities } from "@/lib/api/activities"
import {
  getActivityCountByDate,
  getDailyAverage,
  getLogs,
  getMostLoggedActivity,
  getStreak,
  getTopActivities,
  getTotalLogs,
} from "@/lib/api/logs"

export async function getTodayFoodLogs(userId: string) {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const [quickLogs, activityLogs] = await Promise.all([
    db.foodLog.findMany({
      where: {
        userId,
        date: { gte: todayStart, lte: todayEnd },
      },
      select: { id: true, foodDescription: true, aiCalories: true, protein: true, carbs: true, fat: true, mealType: true, date: true },
      orderBy: { date: "asc" },
    }),
    db.activityLog.findMany({
      where: {
        activity: { userId },
        foodDescription: { not: null },
        date: { gte: todayStart, lte: todayEnd },
      },
      select: { id: true, foodDescription: true, aiCalories: true, date: true },
      orderBy: { date: "asc" },
    }),
  ])

  const normalizedActivityLogs = activityLogs.map((l) => ({
    ...l,
    protein: null,
    carbs: null,
    fat: null,
    mealType: "SNACK" as const,
  }))

  return [...quickLogs, ...normalizedActivityLogs].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )
}

type DateRangeType = {
  from: Date
  to: Date
}

export async function getDashboardData(
  userId: string,
  dateRange: DateRangeType
) {
  const [
    activityLogs,
    foodLogs,
    streak,
    totalLogs,
    mostLoggedActivity,
    activityCountByDate,
    topActivities,
    userActivities,
  ] = await Promise.all([
    getLogs(userId, dateRange, "user"),
    db.foodLog.findMany({
      where: {
        userId,
        date: { gte: dateRange.from, lte: dateRange.to },
      },
      select: { id: true, date: true, foodDescription: true, aiCalories: true, protein: true, carbs: true, fat: true, mealType: true },
      orderBy: { date: "desc" },
    }),
    getStreak(userId, "user"),
    getTotalLogs(userId, dateRange, "user"),
    getMostLoggedActivity(userId, dateRange),
    getActivityCountByDate(userId, dateRange),
    getTopActivities(userId, dateRange),
    getUserActivities(userId),
  ])

  const mappedFoodLogs = foodLogs.map((l) => ({
    id: l.id,
    date: l.date,
    count: 1,
    foodDescription: l.foodDescription,
    aiCalories: l.aiCalories,
    activity: { id: "", name: "Quick Log" },
    source: "food" as const,
  }))

  const mappedActivityLogs = activityLogs.map((l) => ({
    ...l,
    source: "activity" as const,
  }))

  const logs = [...mappedFoodLogs, ...mappedActivityLogs].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  )

  return {
    logs,
    streak,
    totalLogs,
    mostLoggedActivity,
    activityCountByDate,
    topActivities,
    userActivities,
  }
}

export async function getStatsDashboardData(
  activityId: string,
  dateRange: DateRangeType
) {
  const [logs, streak, totalLogs, dailyAverage] = await Promise.all([
    getLogs(activityId, dateRange, "activity"),
    getStreak(activityId, "activity"),
    getTotalLogs(activityId, dateRange, "activity"),
    getDailyAverage(activityId, dateRange),
  ])

  return {
    logs,
    streak,
    totalLogs,
    dailyAverage,
  }
}
