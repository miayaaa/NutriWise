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
import { TodayIntake } from "@/components/pages/dashboard/today-intake"
import { TodayWorkouts } from "@/components/pages/dashboard/today-workouts"
import { WaterProgress } from "@/components/pages/dashboard/water-progress"
import { WeightTracker } from "@/components/pages/dashboard/weight-tracker"
import { WeeklySnapshot } from "@/components/pages/dashboard/weekly-snapshot"
import { MealReminderBanner } from "@/components/pages/dashboard/meal-reminder-banner"

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

  const [todayMeals, dbUser, todayWater, weightLogs, todayWorkouts, weeklyStats] = await Promise.all([
    getTodayFoodLogs(user.id),
    db.user.findUnique({
      where: { id: user.id },
      select: {
        dailyCalorieGoal: true,
        dailyWaterGoal: true,
        weightGoalKg: true,
        fastingEnabled: true,
        fastingStart: true,
        fastingEnd: true,
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
  ])

  return (
    <Shell className="w-full px-4 md:px-0">
      {/* Meal reminder — client-side time check, no SSR mismatch */}
      <MealReminderBanner
        loggedMealTypes={todayMeals.map((m) => m.mealType)}
      />

      {/* Quick log — food / water / workout dialogs */}
      <QuickLogCard />

      {/* Fasting status */}
      {dbUser?.fastingEnabled && (
        <FastingStatus
          fastingStart={dbUser.fastingStart}
          fastingEnd={dbUser.fastingEnd}
          todayLogs={todayMeals.map((m) => ({ date: m.date, foodDescription: m.foodDescription }))}
        />
      )}

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

      {/* Today summary — 3 cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <TodayIntake
          meals={todayMeals.map((m) => ({ ...m, date: m.date.toISOString() }))}
          dailyCalorieGoal={dbUser?.dailyCalorieGoal}
        />
        <WaterProgress
          initialLogs={todayWater.map((l) => ({ ...l, date: l.date.toISOString() }))}
          dailyGoal={dbUser?.dailyWaterGoal ?? 2000}
        />
        <WeightTracker
          initialLogs={weightLogs.map((l) => ({ ...l, date: l.date.toISOString() }))}
          weightGoalKg={dbUser?.weightGoalKg ?? null}
        />
        <TodayWorkouts workouts={todayWorkouts} />
      </div>
    </Shell>
  )
}
