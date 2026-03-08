import { Metadata } from "next"
import { redirect } from "next/navigation"

import { getCoachInsight } from "@/lib/api/coach-insights"
import { authOptions } from "@/lib/auth"
import { getCurrentUser } from "@/lib/session"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { CoachInsightsCard } from "@/components/pages/dashboard/coach-insights-card"

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
      <CoachInsightsCard initialInsight={coachInsight} />

      {/* Chat UI — coming soon */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <p className="text-base font-medium">Coach Chat</p>
        <p className="mt-1 text-sm text-muted-foreground">AI chat with your coach is coming soon.</p>
      </div>
    </Shell>
  )
}
