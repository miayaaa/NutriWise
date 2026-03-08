import { Metadata } from "next"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { AppearanceForm } from "@/components/settings/appearance-form"
import { UserBodyMetricsForm } from "@/components/user/user-body-metrics-form"
import { UserCalorieGoalForm } from "@/components/user/user-calorie-goal-form"
import { UserFastingForm } from "@/components/user/user-fasting-form"
import { UserNameForm } from "@/components/user/user-name-form"
import { UserWaterGoalForm } from "@/components/user/user-water-goal-form"

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage account and app settings.",
}

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect(authOptions?.pages?.signIn || "/signin")
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      dailyCalorieGoal: true,
      dailyWaterGoal: true,
      heightCm: true,
      weightGoalKg: true,
      fastingEnabled: true,
      fastingStart: true,
      fastingEnd: true,
    },
  })

  return (
    <Shell>
      <DashboardHeader
        heading="Settings"
        text="Manage account and app settings."
      />
      <div className="grid grid-cols-1 gap-6">
        <UserNameForm user={{ id: user.id, name: user.name || "" }} />
        <UserCalorieGoalForm
          user={{ id: user.id, dailyCalorieGoal: dbUser?.dailyCalorieGoal }}
        />
        <UserWaterGoalForm
          user={{ id: user.id, dailyWaterGoal: dbUser?.dailyWaterGoal ?? 2000 }}
        />
        <UserBodyMetricsForm
          user={{
            id: user.id,
            heightCm: dbUser?.heightCm ?? null,
            weightGoalKg: dbUser?.weightGoalKg ?? null,
          }}
        />
        <UserFastingForm
          user={{
            id: user.id,
            fastingEnabled: dbUser?.fastingEnabled ?? false,
            fastingStart: dbUser?.fastingStart ?? 12,
            fastingEnd: dbUser?.fastingEnd ?? 20,
          }}
        />
        <AppearanceForm />
      </div>
    </Shell>
  )
}
