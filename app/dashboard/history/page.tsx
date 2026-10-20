import { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { getFoodHistory } from "@/lib/api/history"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { FoodHistoryView } from "@/components/pages/dashboard/food-history-view"
import { TodayWorkouts } from "@/components/pages/dashboard/today-workouts"

export const metadata: Metadata = {
  title: "History",
  description: "Your food and workout history.",
}

export default async function HistoryPage() {
  const user = await getCurrentUser()
  if (!user) redirect(authOptions?.pages?.signIn || "/signin")

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const [history, todayWorkouts] = await Promise.all([
    getFoodHistory(user.id),
    db.workoutLog.findMany({
      where: { userId: user.id, date: { gte: today, lte: todayEnd } },
      select: { id: true, type: true, durationMin: true, details: true, notes: true, aiComment: true },
      orderBy: { date: "asc" },
    }),
  ])

  return (
    <Shell className="w-full px-4 md:px-0">
      <DashboardHeader heading="History" text="Your workouts and meals.">
        <Link href="/dashboard/progress" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start md:self-auto")}>
          <Icons.camera className="mr-2 h-4 w-4" />
          Progress photos
        </Link>
      </DashboardHeader>

      <TodayWorkouts workouts={todayWorkouts} />

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Food History
        </h3>
        <FoodHistoryView history={history} />
      </div>
    </Shell>
  )
}
