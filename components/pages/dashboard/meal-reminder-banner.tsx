"use client"

import * as React from "react"
import { Icons } from "@/components/icons"

interface MealReminderBannerProps {
  loggedMealTypes: string[]
}

export function MealReminderBanner({ loggedMealTypes }: MealReminderBannerProps) {
  const [dismissed, setDismissed] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    const hour = new Date().getHours()
    const has = (type: string) => loggedMealTypes.includes(type)

    let msg: string | null = null
    if (hour >= 20 && !has("DINNER")) {
      msg = "Haven't logged dinner yet — take 10 seconds to log it now."
    } else if (hour >= 15 && !has("BREAKFAST") && !has("LUNCH")) {
      msg = "No meals logged today — add breakfast or lunch to track your intake."
    } else if (hour >= 11 && !has("BREAKFAST")) {
      msg = "Haven't logged breakfast yet — log it before you forget!"
    }

    setMessage(msg)
  }, [loggedMealTypes])

  if (!message || dismissed) return null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
      <Icons.warning className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/50"
        aria-label="Dismiss"
      >
        <Icons.close className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
