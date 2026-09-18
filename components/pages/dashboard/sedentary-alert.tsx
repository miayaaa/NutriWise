"use client"

import * as React from "react"

import { Icons } from "@/components/icons"

interface SedentaryStatus {
  sedentaryHours: number | null
  hasLoggedWorkoutToday: boolean
  isSedentaryAlert: boolean
}

const STATUS_POLL_MS = 5 * 60 * 1000 // how often the banner's displayed status refreshes
const NOTIFY_CHECK_MS = 60 * 1000 // how often we check whether an hour has elapsed
const NOTIFY_INTERVAL_MS = 60 * 60 * 1000 // remind every hour while the tab is open, regardless of computed status
const SNOOZE_KEY = "nutriwise:sedentary-snooze-until"
const SNOOZE_MS = 60 * 60 * 1000 // 1 hour
const LAST_NOTIFIED_KEY = "nutriwise:sedentary-last-notified"
const OPT_IN_DISMISSED_KEY = "nutriwise:notify-opt-in-dismissed-until"
const OPT_IN_DISMISS_MS = 24 * 60 * 60 * 1000 // re-offer after a day if ignored

function readTimestamp(key: string): number {
  try {
    return Number(localStorage.getItem(key) ?? 0)
  } catch {
    return 0
  }
}

function writeTimestamp(key: string, ts: number) {
  try {
    localStorage.setItem(key, String(ts))
  } catch {
    // ignore — private browsing / blocked storage
  }
}

// Android Chrome throws on `new Notification()` from a regular page — it requires
// ServiceWorkerRegistration.showNotification() instead. Desktop browsers support both.
// This is a local (in-tab) notification only, not push — it can't fire when the tab is closed.
async function showLocalNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission !== "granted") return

  const options: NotificationOptions = {
    body,
    icon: "/android-chrome-192x192.png",
    tag: "nutriwise-sedentary",
  }

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, options)
      return
    }
  } catch {
    // fall through to the plain constructor
  }

  try {
    new Notification(title, options)
  } catch {
    // unsupported in this browser context — silently skip, the in-page banner still shows
  }
}

interface SedentaryAlertProps {
  initialStatus: SedentaryStatus
}

export function SedentaryAlert({ initialStatus }: SedentaryAlertProps) {
  const [status, setStatus] = React.useState(initialStatus)
  const [snoozed, setSnoozed] = React.useState(false)
  const [permission, setPermission] = React.useState<NotificationPermission | null>(null)
  const [optInDismissed, setOptInDismissed] = React.useState(true) // default true until we know, avoids a flash

  React.useEffect(() => {
    setSnoozed(Date.now() < readTimestamp(SNOOZE_KEY))
    setOptInDismissed(Date.now() < readTimestamp(OPT_IN_DISMISSED_KEY))
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission)
    }
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])

  // Keeps the banner's displayed status roughly live — purely cosmetic, does not gate notifications.
  React.useEffect(() => {
    if (typeof document === "undefined") return
    let cancelled = false
    async function refreshStatus() {
      if (document.visibilityState !== "visible") return
      try {
        const res = await fetch("/api/activity-status")
        if (!res.ok || cancelled) return
        const data = (await res.json()) as SedentaryStatus
        if (!cancelled) setStatus(data)
      } catch {
        // silent — this is a soft nudge, not critical data
      }
    }
    const id = setInterval(refreshStatus, STATUS_POLL_MS)
    document.addEventListener("visibilitychange", refreshStatus)
    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener("visibilitychange", refreshStatus)
    }
  }, [])

  // Plain hourly reminder while the tab is open — not gated on the computed sedentary
  // status (which is only a rough proxy, see lib/api/activity-status.ts), just a
  // "get up and move" nudge on a fixed cadence.
  React.useEffect(() => {
    if (snoozed || permission !== "granted") return
    function maybeNotify() {
      if (Date.now() - readTimestamp(LAST_NOTIFIED_KEY) < NOTIFY_INTERVAL_MS) return
      writeTimestamp(LAST_NOTIFIED_KEY, Date.now())
      showLocalNotification(
        "Time to move 🚶",
        "A short walk (even 5–10 min) activates lipoprotein lipase (LPL) and helps metabolize fat — sitting suppresses it."
      )
    }
    const id = setInterval(maybeNotify, NOTIFY_CHECK_MS)
    return () => clearInterval(id)
  }, [snoozed, permission])

  const hours = status.sedentaryHours != null ? Math.floor(status.sedentaryHours) : null
  const showStatusBanner = status.isSedentaryAlert && !snoozed
  const showOptIn = permission === "default" && !optInDismissed

  if (!showStatusBanner && !showOptIn) return null

  return (
    <div className="space-y-2">
      {showStatusBanner && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-900/20">
          <Icons.warning className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1 space-y-0.5">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              {hours != null ? `Sedentary for ${hours}+ hours` : "No movement logged yet today"}
            </p>
            <p className="text-amber-700/90 dark:text-amber-400/80">
              A short walk (even 5–10 min) activates lipoprotein lipase (LPL) and helps your body metabolize fat — sitting suppresses it.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const until = Date.now() + SNOOZE_MS
              writeTimestamp(SNOOZE_KEY, until)
              setSnoozed(true)
            }}
            className="shrink-0 rounded-md p-1 text-amber-600/70 hover:bg-amber-100 hover:text-amber-800 dark:text-amber-400/70 dark:hover:bg-amber-900/40"
            aria-label="Dismiss for 1 hour"
          >
            <Icons.close className="h-4 w-4" />
          </button>
        </div>
      )}

      {showOptIn && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-sm">
          <span className="flex-1 text-foreground/80">
            🔔 Want an hourly reminder to get up and move while this page is open?
          </span>
          <button
            type="button"
            onClick={() => Notification.requestPermission().then(setPermission)}
            className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
          >
            Enable
          </button>
          <button
            type="button"
            onClick={() => {
              writeTimestamp(OPT_IN_DISMISSED_KEY, Date.now() + OPT_IN_DISMISS_MS)
              setOptInDismissed(true)
            }}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Not now"
          >
            <Icons.close className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
