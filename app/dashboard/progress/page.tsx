import { Metadata } from "next"
import { redirect } from "next/navigation"

import { getProgressPhotos } from "@/lib/api/progress-photos"
import { authOptions } from "@/lib/auth"
import { getCurrentUser } from "@/lib/session"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { ProgressPhotos } from "@/components/pages/dashboard/progress-photos"

export const metadata: Metadata = {
  title: "Progress",
  description: "Your progress photos alongside weight and waist trends.",
}

export default async function ProgressPage() {
  const user = await getCurrentUser()
  if (!user) redirect(authOptions?.pages?.signIn || "/signin")

  const photos = await getProgressPhotos(user.id)

  return (
    <Shell className="w-full px-4 md:px-0">
      <DashboardHeader heading="Progress" text="Photos with the weight and waist logged that week." />
      <ProgressPhotos photos={photos} />
    </Shell>
  )
}
