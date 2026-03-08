import { Metadata } from "next"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { SignOutButton } from "@/components/user/sign-out-button"
import { UserBodyMetricsForm } from "@/components/user/user-body-metrics-form"
import { UserDailyGoalsForm } from "@/components/user/user-daily-goals-form"
import { UserFastingForm } from "@/components/user/user-fasting-form"
import { UserFitnessGoalForm } from "@/components/user/user-fitness-goal-form"
import { UserNameForm } from "@/components/user/user-name-form"

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage account and app settings.",
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {children}
      </span>
      <div className="flex-1 border-t" />
    </div>
  )
}

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect(authOptions?.pages?.signIn || "/signin")

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      dailyCalorieGoal: true,
      dailyWaterGoal: true,
      heightCm: true,
      weightGoalKg: true,
      fitnessGoal: true,
      age: true,
      gender: true,
      fastingEnabled: true,
      fastingStart: true,
      fastingEnd: true,
    },
  })

  return (
    <Shell>
      <DashboardHeader heading="Settings" text="Manage account and app settings." />

      <div className="grid grid-cols-1 gap-4">

        {/* ── Profile ─────────────────────────────── */}
        <SectionLabel>Profile</SectionLabel>
        <UserNameForm user={{ id: user.id, name: user.name || "" }} />
        <UserFitnessGoalForm
          user={{ id: user.id, fitnessGoal: (dbUser?.fitnessGoal as any) ?? null }}
        />

        {/* ── Goals ───────────────────────────────── */}
        <SectionLabel>Goals</SectionLabel>
        <UserDailyGoalsForm
          user={{
            id: user.id,
            dailyCalorieGoal: dbUser?.dailyCalorieGoal,
            dailyWaterGoal: dbUser?.dailyWaterGoal ?? 2000,
          }}
        />

        {/* ── Body ────────────────────────────────── */}
        <SectionLabel>Body</SectionLabel>
        <UserBodyMetricsForm
          user={{
            id: user.id,
            heightCm: dbUser?.heightCm ?? null,
            weightGoalKg: dbUser?.weightGoalKg ?? null,
            age: dbUser?.age ?? null,
            gender: dbUser?.gender ?? null,
          }}
        />

        {/* ── Lifestyle ───────────────────────────── */}
        <SectionLabel>Lifestyle</SectionLabel>
        <UserFastingForm
          user={{
            id: user.id,
            fastingEnabled: dbUser?.fastingEnabled ?? false,
            fastingStart: dbUser?.fastingStart ?? 12,
            fastingEnd: dbUser?.fastingEnd ?? 20,
          }}
        />

        {/* ── Account ─────────────────────────────── */}
        <SectionLabel>Account</SectionLabel>
        <SignOutButton />

      </div>
    </Shell>
  )
}
