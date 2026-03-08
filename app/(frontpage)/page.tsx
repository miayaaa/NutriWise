import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/session"
import Hero from "@/components/pages/hero"
import { PWARedirect } from "@/components/pwa-redirect"

export default async function Home() {
  const user = await getCurrentUser()
  if (user) redirect("/dashboard")

  return (
    <main>
      <Hero />
      <PWARedirect />
    </main>
  )
}
