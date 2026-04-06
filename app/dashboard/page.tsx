import { Metadata } from "next"
import { redirect } from "next/navigation"

import { getTodayFoodLogs } from "@/lib/api/dashboard"
import { getWeeklyStats } from "@/lib/api/weekly-stats"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { Shell } from "@/components/layout/shell"
import { FastingStatus } from "@/components/pages/dashboard/fasting-status"
import { QuickLogCard } from "@/components/pages/dashboard/quick-log-card"
import { DailyGoalCard } from "@/components/pages/dashboard/today-intake"
import { TodayWorkouts } from "@/components/pages/dashboard/today-workouts"
import { WaterProgress } from "@/components/pages/dashboard/water-progress"
import { WeightTracker } from "@/components/pages/dashboard/weight-tracker"
import { WaistTracker } from "@/components/pages/dashboard/waist-tracker"
import { WeeklySnapshot } from "@/components/pages/dashboard/weekly-snapshot"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default async function Dashboard() {
  const user = await getCurrentUser()
  if (!user) redirect(authOptions?.pages?.signIn || "/signin")

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89)
  ninetyDaysAgo.setHours(0, 0, 0, 0)

  const ninetyDaysAgoMeasure = new Date()
  ninetyDaysAgoMeasure.setDate(ninetyDaysAgoMeasure.getDate() - 89)
  ninetyDaysAgoMeasure.setHours(0, 0, 0, 0)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const [todayMeals, dbUser, todayWater, weightLogs, todayWorkouts, weeklyStats, bodyMeasurements, recentWorkoutDates] = await Promise.all([
    getTodayFoodLogs(user.id),
    db.user.findUnique({
      where: { id: user.id },
      select: {
        dailyCalorieGoal: true,
        dailyWaterGoal: true,
        weightGoalKg: true,
        fitnessGoal: true,
        age: true,
        gender: true,
        heightCm: true,
        fastingEnabled: true,
        fastingStart: true,
        fastingEnd: true,
        lastPeriodDate: true,
        avgCycleDays: true,
      },
    }),
    db.waterLog.findMany({
      where: { userId: user.id, date: { gte: today, lte: todayEnd } },
      select: { id: true, amount: true, date: true },
      orderBy: { date: "asc" },
    }),
    db.weightLog.findMany({
      where: { userId: user.id, date: { gte: ninetyDaysAgo } },
      select: { id: true, weightKg: true, date: true },
      orderBy: { date: "asc" },
    }),
    db.workoutLog.findMany({
      where: { userId: user.id, date: { gte: today, lte: todayEnd } },
      select: { id: true, type: true, durationMin: true, details: true, notes: true, aiComment: true },
      orderBy: { date: "asc" },
    }),
    getWeeklyStats(user.id),
    db.bodyMeasurement.findMany({
      where: { userId: user.id, date: { gte: ninetyDaysAgoMeasure } },
      select: { id: true, waistCm: true, hipCm: true, feelScore: true, notes: true, date: true },
      orderBy: { date: "asc" },
    }),
    db.workoutLog.findMany({
      where: { userId: user.id, date: { gte: sevenDaysAgo, lt: today } },
      select: { date: true },
      orderBy: { date: "desc" },
    }),
  ])

  // Protein target (Mifflin-St Jeor body-weight method)
  const latestWeight = weightLogs[weightLogs.length - 1] ?? null
  let proteinTargetG: number | null = null
  if (latestWeight?.weightKg && dbUser?.fitnessGoal) {
    const multiplier = dbUser.fitnessGoal === "muscle_gain" || dbUser.fitnessGoal === "body_recomposition" ? 2.0 : 1.8
    proteinTargetG = Math.round(latestWeight.weightKg * multiplier)
  }

  // Carb & fat targets derived from remaining calories after protein
  let carbTargetG: number | null = null
  let fatTargetG: number | null = null
  if (proteinTargetG && dbUser?.dailyCalorieGoal) {
    const remainingKcal = dbUser.dailyCalorieGoal - proteinTargetG * 4
    if (remainingKcal > 0) {
      // muscle_gain: more carbs for energy & glycogen; fat_loss: balanced; others: default
      const carbRatio = dbUser.fitnessGoal === "muscle_gain" ? 0.60
        : dbUser.fitnessGoal === "fat_loss" ? 0.50
        : 0.55
      carbTargetG = Math.round((remainingKcal * carbRatio) / 4)
      fatTargetG  = Math.round((remainingKcal * (1 - carbRatio)) / 9)
    }
  }

  // Consecutive training days (today + look back through recentWorkoutDates)
  const pastWorkoutDateSet = new Set(
    recentWorkoutDates.map((w) => w.date.toISOString().split("T")[0])
  )
  const todayHasWorkout = todayWorkouts.length > 0
  let consecutiveTrainingDays = todayHasWorkout ? 1 : 0
  if (todayHasWorkout) {
    for (let i = 1; i <= 6; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      if (pastWorkoutDateSet.has(d.toISOString().split("T")[0])) {
        consecutiveTrainingDays++
      } else {
        break
      }
    }
  }

  return (
    <Shell className="w-full px-4 md:px-0">
      {/* Quick log — food / water / workout dialogs */}
      <QuickLogCard />

      {/* Today summary — 3 cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DailyGoalCard
          meals={todayMeals.map((m) => ({ ...m, date: m.date.toISOString() }))}
          dailyCalorieGoal={dbUser?.dailyCalorieGoal}
          proteinTargetG={proteinTargetG}
          carbTargetG={carbTargetG}
          fatTargetG={fatTargetG}
          workoutCount={todayWorkouts.length}
          consecutiveTrainingDays={consecutiveTrainingDays}
        />
        <WaterProgress
          initialLogs={todayWater.map((l) => ({ ...l, date: l.date.toISOString() }))}
          dailyGoal={dbUser?.dailyWaterGoal ?? 2000}
        />
        <WeightTracker
          userId={user.id}
          initialLogs={weightLogs.map((l) => ({ ...l, date: l.date.toISOString() }))}
          weightGoalKg={dbUser?.weightGoalKg ?? null}
          lastPeriodDate={dbUser?.lastPeriodDate?.toISOString() ?? null}
          avgCycleDays={dbUser?.avgCycleDays ?? 28}
        />
        <WaistTracker
          initialLogs={bodyMeasurements.map((l) => ({ ...l, date: l.date.toISOString() }))}
          waistGoalCm={72}
        />
        <TodayWorkouts workouts={todayWorkouts} />
      </div>

      {/* Weekly snapshot */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <WeeklySnapshot
          avgKcalPerLoggedDay={weeklyStats.avgKcalPerLoggedDay}
          daysLoggedFood={weeklyStats.daysLoggedFood}
          workoutDaysThisWeek={weeklyStats.workoutDaysThisWeek}
          totalWorkoutMinThisWeek={weeklyStats.totalWorkoutMinThisWeek}
          foodStreak={weeklyStats.foodStreak}
          workoutStreak={weeklyStats.workoutStreak}
          dailyKcal={weeklyStats.dailyKcal}
          dailyCalorieGoal={dbUser?.dailyCalorieGoal}
        />
      </div>

      {/* Fasting status — secondary feature, shown below main content */}
      {dbUser?.fastingEnabled && (
        <FastingStatus
          fastingStart={dbUser.fastingStart}
          fastingEnd={dbUser.fastingEnd}
          todayLogs={todayMeals.map((m) => ({ date: m.date, foodDescription: m.foodDescription }))}
        />
      )}
    </Shell>
  )
}
