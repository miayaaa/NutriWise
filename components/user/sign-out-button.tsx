"use client"

import { signOut } from "next-auth/react"
import { Icons } from "@/components/icons"

export function SignOutButton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="space-y-1 mb-4">
        <h3 className="font-medium">Sign out</h3>
        <p className="text-sm text-muted-foreground">Sign out of your NutriWise account.</p>
      </div>
      <button
        onClick={() =>
          signOut({ callbackUrl: `${window.location.origin}/signin` })
        }
        className="flex items-center gap-2 rounded-md border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
      >
        <Icons.signout className="h-4 w-4" />
        Sign out
      </button>
    </div>
  )
}
