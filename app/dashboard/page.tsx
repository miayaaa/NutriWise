import { Metadata } from "next"
import { redirect } from "next/navigation"

import { getTodayFoodLogs } from "@/lib/api/dashboard"
import { getFoodHistory } from "@/lib/api/history"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { FastingStatus } from "@/components/pages/dashboard/fasting-status"
import { FoodHistoryView } from "@/components/pages/dashboard/food-history-view"
import { QuickFoodLog } from "@/components/pages/dashboard/quick-food-log"
import { TodayIntake } from "@/components/pages/dashboard/today-intake"
import { TodayWorkouts } from "@/components/pages/dashboard/today-workouts"
import { WaterProgress } from "@/components/pages/dashboard/water-progress"
import { WorkoutLogLauncher } from "@/components/pages/dashboard/workout-log-launcher"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Monitor your progress.",
}

export default async function Dashboard() {
  const user = await getCurrentUser()
  if (!user) redirect(authOptions?.pages?.signIn || "/signin")

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const [todayMeals, dbUser, history, todayWater, todayWorkouts] = await Promise.all([
    getTodayFoodLogs(user.id),
    db.user.findUnique({
      where: { id: user.id },
      select: {
        dailyCalorieGoal: true,
        dailyWaterGoal: true,
        fastingEnabled: true,
        fastingStart: true,
        fastingEnd: true,
      },
    }),
    getFoodHistory(user.id),
    db.waterLog.findMany({
      where: { userId: user.id, date: { gte: today, lte: todayEnd } },
      select: { id: true, amount: true, date: true },
      orderBy: { date: "asc" },
    }),
    (async () => {
      try {
        return await db.workoutLog.findMany({
          where: { userId: user.id, date: { gte: today, lte: todayEnd } },
          select: { id: true, type: true, durationMin: true, details: true, notes: true, aiComment: true },
          orderBy: { date: "asc" },
        })
      } catch {
        const legacyLogs = await db.workoutLog.findMany({
          where: { userId: user.id, date: { gte: today, lte: todayEnd } },
          select: { id: true, type: true, durationMin: true, notes: true, aiComment: true },
          orderBy: { date: "asc" },
        })
        return legacyLogs.map((log) => ({ ...log, details: null }))
      }
    })(),
  ])

  return (
    <Shell>
      <DashboardHeader heading="Dashboard" text="Monitor your progress." />

      {/* Quick food logger */}
      <QuickFoodLog />

      {/* Fasting status */}
      {dbUser?.fastingEnabled && (
        <FastingStatus
          fastingStart={dbUser.fastingStart}
          fastingEnd={dbUser.fastingEnd}
          todayLogs={todayMeals.map((m) => ({ date: m.date, foodDescription: m.foodDescription }))}
        />
      )}

      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Workout Tracker</h3>
            <p className="text-sm text-muted-foreground">
              Log strength sets and weight, cardio incline/elevation, or any custom workout.
            </p>
          </div>
          <div className="hidden md:block">
            <WorkoutLogLauncher />
          </div>
        </div>
      </div>

      {/* Today's workouts */}
      <TodayWorkouts workouts={todayWorkouts} />

      {/* Today summary — 2 col on md+ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TodayIntake meals={todayMeals} dailyCalorieGoal={dbUser?.dailyCalorieGoal} />
        <WaterProgress
          initialLogs={todayWater.map((l) => ({ ...l, date: l.date.toISOString() }))}
          dailyGoal={dbUser?.dailyWaterGoal ?? 2000}
        />
      </div>

      {/* 30-day food history */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Recent History
        </h3>
        <FoodHistoryView history={history} />
      </div>
    </Shell>
  )
}
