import { Metadata } from "next"
import { redirect } from "next/navigation"

import { getCoachInsight } from "@/lib/api/coach-insights"
import { authOptions } from "@/lib/auth"
import { getCurrentUser } from "@/lib/session"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { CoachInsightsCard } from "@/components/pages/dashboard/coach-insights-card"
import { CoachChat } from "@/components/pages/dashboard/coach-chat"

export const metadata: Metadata = {
  title: "AI Coach",
  description: "Your personalized AI nutrition and fitness coach.",
}

export default async function CoachPage() {
  const user = await getCurrentUser()
  if (!user) redirect(authOptions?.pages?.signIn || "/signin")

  const coachInsight = await getCoachInsight(user.id, "7d")

  return (
    <Shell className="w-full px-4 md:px-0">
      <DashboardHeader heading="AI Coach" text="Personalized insights and guidance." />
      <CoachChat />

      <CoachInsightsCard initialInsight={coachInsight} />
    </Shell>
  )
}
