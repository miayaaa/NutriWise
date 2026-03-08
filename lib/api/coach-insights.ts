import { Prisma } from "@prisma/client"

import { generateCoachInsight, type CoachInsightMetrics, type CoachInsightResult } from "@/lib/ai/coach-insights"
import { db } from "@/lib/db"

export type CoachRangeType = "7d" | "30d" | "90d"

const RANGE_DAYS: Record<CoachRangeType, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
}

function getRangeWindow(rangeType: CoachRangeType) {
  const days = RANGE_DAYS[rangeType]
  const endDate = new Date()
  endDate.setHours(23, 59, 59, 999)
  const startDate = new Date(endDate)
  startDate.setDate(endDate.getDate() - days + 1)
  startDate.setHours(0, 0, 0, 0)
  return { startDate, endDate, days }
}

function toNumber(value: number | null | undefined) {
  return typeof value === "number" ? value : 0
}

function fromJsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((x) => String(x)).slice(0, 3)
}

function serializeInsight(
  insight: {
    rangeType: string
    startDate: Date
    endDate: Date
    summary: string
    coachComment: string
    actionItems: Prisma.JsonValue
    score: number
    generatedAt: Date
  }
) {
  return {
    rangeType: insight.rangeType as CoachRangeType,
    startDate: insight.startDate.toISOString(),
    endDate: insight.endDate.toISOString(),
    summary: insight.summary,
    coachComment: insight.coachComment,
    actionItems: fromJsonStringArray(insight.actionItems),
    score: insight.score,
    generatedAt: insight.generatedAt.toISOString(),
  }
}

async function aggregateMetrics(
  userId: string,
  rangeType: CoachRangeType
): Promise<CoachInsightMetrics> {
  const { startDate, endDate, days } = getRangeWindow(rangeType)

  const [foodAgg, waterAgg, workoutLogs, user, weightLogs] = await Promise.all([
    db.foodLog.aggregate({
      where: { userId, date: { gte: startDate, lte: endDate } },
      _count: { _all: true },
      _sum: { aiCalories: true, protein: true, carbs: true, fat: true },
    }),
    db.waterLog.aggregate({
      where: { userId, date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.workoutLog.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      select: { type: true, durationMin: true, details: true, date: true },
      orderBy: { date: "asc" },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: {
        dailyWaterGoal: true,
        weightGoalKg: true,
        fitnessGoal: true,
        fastingEnabled: true,
        fastingStart: true,
        fastingEnd: true,
      },
    }),
    db.weightLog.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      select: { weightKg: true, date: true },
      orderBy: { date: "asc" },
    }),
  ])

  const mealCount = foodAgg._count._all
  const totalCalories = toNumber(foodAgg._sum.aiCalories)
  const totalProtein = toNumber(foodAgg._sum.protein)
  const totalCarbs = toNumber(foodAgg._sum.carbs)
  const totalFat = toNumber(foodAgg._sum.fat)
  const totalWaterMl = toNumber(waterAgg._sum.amount)
  const sessionCount = workoutLogs.length
  const totalDurationMin = workoutLogs.reduce((s, w) => s + w.durationMin, 0)

  type WorkoutDetailsJson = {
    mode?: string
    strength?: { exercise?: string; sets?: number; reps?: number; weightKg?: number }
    cardio?: { cardioType?: string; distanceKm?: number; avgSpeedKph?: number }
    other?: { workoutName?: string }
  }

  const workoutSessions = workoutLogs.map((w) => {
    const d = (w.details ?? {}) as WorkoutDetailsJson
    if (d.mode === "strength" && d.strength) {
      return {
        type: "Strength",
        durationMin: w.durationMin,
        exercise: d.strength.exercise ?? "Unknown",
        sets: d.strength.sets,
        reps: d.strength.reps,
        weightKg: d.strength.weightKg,
      }
    }
    if (d.mode === "cardio" && d.cardio) {
      return {
        type: "Cardio",
        durationMin: w.durationMin,
        cardioType: d.cardio.cardioType ?? "Cardio",
        distanceKm: d.cardio.distanceKm,
        avgSpeedKph: d.cardio.avgSpeedKph,
      }
    }
    return { type: w.type, durationMin: w.durationMin }
  })
  const weightCount = weightLogs.length
  const currentWeightKg = weightCount > 0 ? weightLogs[weightCount - 1].weightKg : null
  const avgWeightKg = weightCount > 0
    ? Math.round((weightLogs.reduce((sum, l) => sum + l.weightKg, 0) / weightCount) * 10) / 10
    : null
  const weightChangeKg = weightCount >= 2
    ? Math.round((weightLogs[weightCount - 1].weightKg - weightLogs[0].weightKg) * 10) / 10
    : 0

  return {
    rangeType,
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days,
    },
    nutrition: {
      mealCount,
      totalCalories: Math.round(totalCalories),
      avgCaloriesPerMeal: mealCount > 0 ? Math.round(totalCalories / mealCount) : 0,
      avgProtein: mealCount > 0 ? Math.round((totalProtein / mealCount) * 10) / 10 : 0,
      avgCarbs: mealCount > 0 ? Math.round((totalCarbs / mealCount) * 10) / 10 : 0,
      avgFat: mealCount > 0 ? Math.round((totalFat / mealCount) * 10) / 10 : 0,
    },
    hydration: {
      totalWaterMl,
      avgWaterMlPerDay: Math.round(totalWaterMl / days),
      dailyGoalMl: user?.dailyWaterGoal ?? 2000,
    },
    workout: {
      sessionCount,
      totalDurationMin,
      avgDurationMin: sessionCount > 0 ? Math.round(totalDurationMin / sessionCount) : 0,
      sessions: workoutSessions,
    },
    fitnessGoal: (user?.fitnessGoal ?? null) as string | null,
    weight: {
      logCount: weightCount,
      currentKg: currentWeightKg,
      avgKg: avgWeightKg,
      changeKg: weightChangeKg,
      goalKg: user?.weightGoalKg ?? null,
    },
    fasting: {
      enabled: user?.fastingEnabled ?? false,
      startHour: user?.fastingStart ?? 12,
      endHour: user?.fastingEnd ?? 20,
    },
  }
}

export async function getCoachInsight(userId: string, rangeType: CoachRangeType) {
  const { startDate, endDate } = getRangeWindow(rangeType)
  const freshnessCutoff = new Date(Date.now() - 12 * 60 * 60 * 1000)

  const cached = await db.coachInsight.findUnique({
    where: {
      userId_rangeType_startDate_endDate: {
        userId,
        rangeType,
        startDate,
        endDate,
      },
    },
  })

  if (cached && cached.generatedAt >= freshnessCutoff) {
    return serializeInsight(cached)
  }

  const metrics = await aggregateMetrics(userId, rangeType)
  const generated: CoachInsightResult = await generateCoachInsight(metrics)

  const saved = await db.coachInsight.upsert({
    where: {
      userId_rangeType_startDate_endDate: {
        userId,
        rangeType,
        startDate,
        endDate,
      },
    },
    create: {
      userId,
      rangeType,
      startDate,
      endDate,
      summary: generated.summary,
      coachComment: generated.coachComment,
      actionItems: generated.actionItems as Prisma.InputJsonValue,
      score: generated.score,
    },
    update: {
      summary: generated.summary,
      coachComment: generated.coachComment,
      actionItems: generated.actionItems as Prisma.InputJsonValue,
      score: generated.score,
      generatedAt: new Date(),
    },
  })

  return serializeInsight(saved)
}
