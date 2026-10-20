import { Metadata } from "next"
import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/session"
import { validateAuthorizeRequest } from "@/lib/mcp/oauth"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Authorize access",
}

export const dynamic = "force-dynamic"

interface AuthorizePageProps {
  searchParams: Record<string, string | undefined>
}

export default async function AuthorizePage({ searchParams }: AuthorizePageProps) {
  const result = await validateAuthorizeRequest(searchParams)
  if (!result.ok) {
    return (
      <main className="container flex h-screen flex-col items-center justify-center">
        <div className="mx-auto w-full space-y-2 text-center sm:w-[380px]">
          <h1 className="text-2xl font-semibold tracking-tight">Can&apos;t authorize</h1>
          <p className="text-sm text-muted-foreground">{result.error}</p>
        </div>
      </main>
    )
  }

  const user = await getCurrentUser()
  if (!user) {
    const query = new URLSearchParams(searchParams as Record<string, string>).toString()
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/oauth/authorize?${query}`)}`)
  }

  const params = result.value
  const redirectHost = new URL(params.redirectUri).host

  return (
    <main className="container flex h-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col space-y-6 sm:w-[380px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Connect {params.clientName ?? "an app"} to NutriWise?
          </h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user.email ?? user.name}
          </p>
        </div>

        <div className="space-y-2 rounded-lg border p-4 text-sm">
          <p>It will be able to:</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Read your profile, food, workout, weight, water and cycle data</li>
            <li>Log and delete food, workouts, weight and water on your behalf</li>
          </ul>
          <p className="pt-2 text-muted-foreground">
            You&apos;ll be sent back to <span className="font-medium text-foreground">{redirectHost}</span>.
            Only approve if you just started connecting from there.
          </p>
        </div>

        <form method="post" action="/api/oauth/authorize" className="flex gap-2">
          {Object.entries(searchParams).map(([key, value]) =>
            value != null ? <input key={key} type="hidden" name={key} value={value} /> : null
          )}
          <button
            type="submit"
            name="decision"
            value="deny"
            className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
          >
            Deny
          </button>
          <button
            type="submit"
            name="decision"
            value="allow"
            className={cn(buttonVariants(), "flex-1")}
          >
            Allow
          </button>
        </form>
      </div>
    </main>
  )
}
