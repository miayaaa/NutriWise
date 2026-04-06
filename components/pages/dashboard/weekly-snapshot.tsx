"use client"

import * as React from "react"
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DailyKcal } from "@/lib/api/weekly-stats"

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

interface WeeklySnapshotProps {
  avgKcalPerLoggedDay: number
  daysLoggedFood: number
  workoutDaysThisWeek: number
  totalWorkoutMinThisWeek: number
  foodStreak: number
  workoutStreak: number
  dailyKcal: DailyKcal[]
  dailyCalorieGoal?: number | null
}

function StreakBadge({ count, label }: { count: number; label: string }) {
  const isActive = count > 0
  const milestone = count >= 100 ? "🏆 100 days!" : count >= 30 ? "⭐ 30 days!" : count >= 14 ? "🎉 2 weeks!" : count >= 7 ? "🔥 1 week!" : null
  const intensity = count >= 30 ? "text-red-500" : count >= 14 ? "text-orange-500" : count >= 7 ? "text-orange-400" : "text-orange-300"
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl px-4 py-3 flex-1 ${isActive ? "bg-orange-50 dark:bg-orange-950/30" : "bg-muted/50"}`}>
      <div className="flex items-baseline gap-1">
        <div className={`text-2xl font-bold tabular-nums leading-none ${isActive ? intensity : "text-muted-foreground"}`}>
          {count}
        </div>
        {isActive && <span className="text-base">🔥</span>}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1 text-center leading-tight">{label}</div>
      {milestone && <div className="text-[10px] font-medium text-orange-500 mt-0.5">{milestone}</div>}
    </div>
  )
}

function WeekDots({ filled, total = 7 }: { filled: number; total?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-full transition-colors ${i < filled ? "bg-emerald-500" : "bg-muted"}`}
        />
      ))}
    </div>
  )
}

function KcalSparkline({
  data,
  avgKcal,
  goalKcal,
}: {
  data: DailyKcal[]
  avgKcal: number
  goalKcal?: number | null
}) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const chartData = data.map((d, i) => ({
    day: DAY_LABELS[i] ?? d.date.slice(5),
    kcal: d.logged ? d.kcal : null,
    date: d.date,
  }))

  const goalDiff = goalKcal && avgKcal > 0 ? avgKcal - goalKcal : null
  const goalDiffColor =
    goalDiff === null ? ""
    : Math.abs(goalDiff) < 150 ? "text-emerald-500"
    : goalDiff > 0 ? "text-rose-500"
    : "text-amber-500"

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Calorie trend</span>
        <div className="text-right">
          {avgKcal > 0 ? (
            <>
              <span className="font-semibold tabular-nums">{avgKcal.toLocaleString("en-US")}</span>
              <span className="text-xs text-muted-foreground ml-1">kcal avg</span>
              {goalDiff !== null && (
                <span className={`ml-2 text-xs font-medium ${goalDiffColor}`}>
                  {goalDiff > 0 ? `+${Math.round(goalDiff)}` : Math.round(goalDiff)} vs goal
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">No data yet</span>
          )}
        </div>
      </div>

      {!mounted ? (
        <div className="h-16 w-full rounded-lg bg-muted/40 animate-pulse" />
      ) : (
      <ResponsiveContainer width="100%" height={64}>
        <AreaChart data={chartData} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id="kcalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: "currentColor" }}
            axisLine={false}
            tickLine={false}
            className="text-muted-foreground"
          />
          {goalKcal && (
            <ReferenceLine
              y={goalKcal}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const val = payload[0]?.value
              if (val == null) return null
              return (
                <div className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs shadow-md">
                  <span className="font-semibold tabular-nums">{Number(val).toLocaleString("en-US")} kcal</span>
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="kcal"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#kcalGradient)"
            dot={(props) => {
              const { cx, cy, payload } = props
              if (payload.kcal == null) return <g key={props.key} />
              // highlight today (last point)
              const isToday = payload.day === DAY_LABELS[6]
              return (
                <circle
                  key={props.key}
                  cx={cx}
                  cy={cy}
                  r={isToday ? 4 : 2.5}
                  fill={isToday ? "#10b981" : "#fff"}
                  stroke="#10b981"
                  strokeWidth={isToday ? 0 : 1.5}
                />
              )
            }}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      )}
    </div>
  )
}

export function WeeklySnapshot({
  avgKcalPerLoggedDay,
  daysLoggedFood,
  workoutDaysThisWeek,
  totalWorkoutMinThisWeek,
  foodStreak,
  workoutStreak,
  dailyKcal,
  dailyCalorieGoal,
}: WeeklySnapshotProps) {
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">This Week</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Streaks */}
        <div className="flex gap-2">
          <StreakBadge count={foodStreak} label="day food streak" />
          <StreakBadge count={workoutStreak} label="day workout streak" />
        </div>

        {/* 7-day calorie sparkline */}
        <KcalSparkline
          data={dailyKcal}
          avgKcal={avgKcalPerLoggedDay}
          goalKcal={dailyCalorieGoal}
        />

        {/* Food logging progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Days logged</span>
            <span className="font-medium tabular-nums">{daysLoggedFood} / 7</span>
          </div>
          <WeekDots filled={daysLoggedFood} />
        </div>

        {/* Workout progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Workout days</span>
            <span className="font-medium tabular-nums">
              {workoutDaysThisWeek} / 4
              {totalWorkoutMinThisWeek > 0 && (
                <span className="text-muted-foreground font-normal ml-1">· {totalWorkoutMinThisWeek} min</span>
              )}
            </span>
          </div>
          <WeekDots filled={workoutDaysThisWeek} total={4} />
        </div>

        {daysLoggedFood === 0 && workoutDaysThisWeek === 0 && (
          <p className="text-sm text-muted-foreground">Start logging to see your weekly trend.</p>
        )}
      </CardContent>
    </Card>
  )
}
