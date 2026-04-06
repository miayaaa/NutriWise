"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getCycleInfo, type CycleInfo } from "@/lib/cycle"

interface WeightLog {
  id: string
  weightKg: number
  date: string | Date
}

interface WeightTrackerProps {
  userId: string
  initialLogs: WeightLog[]
  weightGoalKg?: number | null
  lastPeriodDate?: string | null
  avgCycleDays?: number
}

type RangeType = 7 | 30

const PHASE_STYLES: Record<CycleInfo["phase"], string> = {
  menstrual:  "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400",
  follicular: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  ovulation:  "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400",
  luteal:     "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function WeightTracker({ userId, initialLogs, weightGoalKg, lastPeriodDate, avgCycleDays = 28 }: WeightTrackerProps) {

  const [logs, setLogs] = React.useState<WeightLog[]>(
    initialLogs.map((x) => ({ ...x, date: new Date(x.date) }))
  )
  const [range, setRange] = React.useState<RangeType>(7)
  const [weightInput, setWeightInput] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  // Cycle state
  const [cycleOpen, setCycleOpen] = React.useState(false)
  const [periodDateInput, setPeriodDateInput] = React.useState(
    lastPeriodDate ? new Date(lastPeriodDate).toISOString().split("T")[0] : ""
  )
  const [cycleLengthInput, setCycleLengthInput] = React.useState(String(avgCycleDays))
  const [cycleInfo, setCycleInfo] = React.useState<CycleInfo | null>(() =>
    lastPeriodDate ? getCycleInfo(new Date(lastPeriodDate), avgCycleDays) : null
  )
  const [isSavingCycle, setIsSavingCycle] = React.useState(false)

  const filtered = React.useMemo(() => {
    const end = startOfDay(new Date())
    end.setHours(23, 59, 59, 999)
    const start = new Date(end)
    start.setDate(end.getDate() - range + 1)
    start.setHours(0, 0, 0, 0)
    return logs
      .filter((l) => { const d = new Date(l.date); return d >= start && d <= end })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [logs, range])

  const latest = filtered[filtered.length - 1] ?? logs[logs.length - 1]
  const first = filtered[0]
  const delta = latest && first ? latest.weightKg - first.weightKg : 0

  async function addWeight() {
    const weightKg = Number(weightInput)
    if (isSaving || !Number.isFinite(weightKg) || weightKg < 25 || weightKg > 350) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/weight-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg }),
      })
      if (!res.ok) {
        toast({ title: "Error", description: "Could not save weight log.", variant: "destructive" })
        return
      }
      const log = await res.json()
      setLogs((prev) => [...prev, { ...log, date: new Date(log.date) }])
      setWeightInput("")
      toast({ description: `Weight logged: ${weightKg.toFixed(1)} kg` })
    } finally {
      setIsSaving(false)
    }
  }

  async function saveCycle() {
    if (!userId || isSavingCycle) return
    const date = periodDateInput ? new Date(periodDateInput) : null
    const length = Number(cycleLengthInput)
    if (date && isNaN(date.getTime())) {
      toast({ title: "Invalid date", variant: "destructive" }); return
    }
    if (!Number.isFinite(length) || length < 21 || length > 45) {
      toast({ title: "Cycle length must be 21–45 days", variant: "destructive" }); return
    }
    setIsSavingCycle(true)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastPeriodDate: date ? date.toISOString() : null,
          avgCycleDays: length,
        }),
      })
      if (!res.ok) { toast({ title: "Could not save", variant: "destructive" }); return }
      setCycleInfo(date ? getCycleInfo(date, length) : null)
      setCycleOpen(false)
      toast({ description: "Cycle updated" })
    } finally {
      setIsSavingCycle(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Weight</CardTitle>
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {[7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setRange(d as RangeType)}
              className={`cursor-pointer rounded-full px-2.5 py-0.5 text-xs ${
                range === d ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Weight + goal */}
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold tabular-nums">
            {latest ? latest.weightKg.toFixed(1) : "--"}
          </span>
          <span className="mb-1 text-sm text-muted-foreground">kg</span>
          {weightGoalKg ? (
            <span className="mb-1 text-xs text-muted-foreground">Goal {weightGoalKg.toFixed(1)} kg</span>
          ) : null}
        </div>

        {/* Trend */}
        <p className="text-xs text-muted-foreground">
          {filtered.length >= 2
            ? `${range}D trend: ${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`
            : "Add more logs to see trend."}
        </p>

        {/* Cycle phase badge */}
        {cycleInfo && (
          <div className={cn(
            "rounded-lg px-3 py-2 space-y-0.5",
            PHASE_STYLES[cycleInfo.phase]
          )}>
            <p className="text-xs font-semibold">
              {cycleInfo.label} · Day {cycleInfo.dayOfCycle}
            </p>
            <p className="text-xs opacity-80">{cycleInfo.shortNote}</p>
          </div>
        )}

        {/* Weight input */}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            min={25}
            max={350}
            step="0.1"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="Log weight (kg)"
            className="w-40"
            onKeyDown={(e) => { if (e.key === "Enter") addWeight() }}
          />
          <button
            onClick={addWeight}
            disabled={isSaving || !weightInput}
            className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
          >
            Add
          </button>
        </div>

        {/* Cycle toggle */}
        <button
          type="button"
          onClick={() => setCycleOpen((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {cycleOpen ? "▲ Hide" : cycleInfo ? "✦ Update cycle" : "✦ Track cycle"}
        </button>

        {cycleOpen && (
          <div className="space-y-2 pt-1">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last period started</p>
              <Input
                type="date"
                value={periodDateInput}
                onChange={(e) => setPeriodDateInput(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-40 text-sm"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Average cycle length (days)</p>
              <Input
                type="number"
                inputMode="numeric"
                min={21}
                max={45}
                value={cycleLengthInput}
                onChange={(e) => setCycleLengthInput(e.target.value)}
                className="w-24 text-sm"
              />
            </div>
            <button
              onClick={saveCycle}
              disabled={isSavingCycle}
              className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              {isSavingCycle ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
