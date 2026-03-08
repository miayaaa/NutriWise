"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MealLog {
  date: Date
  foodDescription: string | null
}

interface FastingStatusProps {
  fastingStart: number  // hour 0-23
  fastingEnd: number    // hour 0-23
  todayLogs: MealLog[]
}

function formatHour(h: number) {
  const ampm = h < 12 ? "AM" : "PM"
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${display}:00 ${ampm}`
}

function formatCountdown(ms: number) {
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function FastingStatus({ fastingStart, fastingEnd, todayLogs }: FastingStatusProps) {
  const [now, setNow] = React.useState<Date | null>(null)

  // Start ticking after mount to avoid SSR/client hydration mismatch.
  React.useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const currentTotalMin = now ? now.getHours() * 60 + now.getMinutes() : null

  const windowStartMin = fastingStart * 60
  const windowEndMin = fastingEnd * 60

  const inWindow = currentTotalMin !== null
    ? currentTotalMin >= windowStartMin && currentTotalMin < windowEndMin
    : false

  // Countdown
  let countdownLabel = "Calculating..."
  let countdownMs = 0
  if (currentTotalMin !== null && inWindow) {
    const minsLeft = windowEndMin - currentTotalMin
    countdownMs = minsLeft * 60_000
    countdownLabel = `Window closes in ${formatCountdown(countdownMs)}`
  } else {
    if (currentTotalMin !== null) {
      let minsUntilOpen = windowStartMin - currentTotalMin
      if (minsUntilOpen < 0) minsUntilOpen += 24 * 60
      countdownMs = minsUntilOpen * 60_000
      countdownLabel = `Window opens in ${formatCountdown(countdownMs)}`
    }
  }

  // Compliance: check if any log is outside the eating window
  const violations = todayLogs.filter((m) => {
    const h = m.date.getHours()
    return h < fastingStart || h >= fastingEnd
  })

  const windowHours = fastingEnd > fastingStart ? fastingEnd - fastingStart : 24 - fastingStart + fastingEnd

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Intermittent Fasting</CardTitle>
        <span className="text-lg">{inWindow ? "🍽️" : "💤"}</span>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current state */}
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${inWindow ? "bg-emerald-500" : "bg-slate-400"} animate-pulse`}
            />
            <span className="text-2xl font-bold">
              {inWindow ? "Eating Window" : "Fasting"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{countdownLabel}</p>
        </div>

        {/* Window info */}
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Window: </span>
          <span className="font-medium">
            {formatHour(fastingStart)} – {formatHour(fastingEnd)}
          </span>
          <span className="text-muted-foreground ml-2">
            ({windowHours}h eating · {24 - windowHours}h fast)
          </span>
        </div>

        {/* Today's compliance */}
        {todayLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No meals logged today yet.</p>
        ) : violations.length === 0 ? (
          <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <span>✅</span>
            <span>All meals within window today</span>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
              <span>⚠️</span>
              <span>{violations.length} meal{violations.length > 1 ? "s" : ""} outside window</span>
            </div>
            {violations.map((v, i) => (
              <p key={i} className="text-xs text-muted-foreground pl-5 truncate">
                {v.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {v.foodDescription}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
