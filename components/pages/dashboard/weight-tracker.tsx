"use client"

import * as React from "react"
import { toast } from "@/components/ui/use-toast"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface WeightLog {
  id: string
  weightKg: number
  date: string | Date
}

interface WeightTrackerProps {
  initialLogs: WeightLog[]
  weightGoalKg?: number | null
}

type RangeType = 7 | 30

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function WeightTracker({ initialLogs, weightGoalKg }: WeightTrackerProps) {
  const [logs, setLogs] = React.useState<WeightLog[]>(
    initialLogs.map((x) => ({ ...x, date: new Date(x.date) }))
  )
  const [range, setRange] = React.useState<RangeType>(7)
  const [weightInput, setWeightInput] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  const filtered = React.useMemo(() => {
    const end = startOfDay(new Date())
    end.setHours(23, 59, 59, 999)
    const start = new Date(end)
    start.setDate(end.getDate() - range + 1)
    start.setHours(0, 0, 0, 0)
    return logs
      .filter((l) => {
        const d = new Date(l.date)
        return d >= start && d <= end
      })
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Weight Tracker</CardTitle>
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
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold tabular-nums">
            {latest ? latest.weightKg.toFixed(1) : "--"}
          </span>
          <span className="mb-1 text-sm text-muted-foreground">kg</span>
          {weightGoalKg ? (
            <span className="mb-1 text-xs text-muted-foreground">Goal {weightGoalKg.toFixed(1)} kg</span>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">
          {filtered.length >= 2
            ? `${range}D trend: ${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`
            : "Add more logs to see trend."}
        </p>

        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={25}
            max={350}
            step="0.1"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="Log weight (kg)"
            className="w-40"
            onKeyDown={(e) => {
              if (e.key === "Enter") addWeight()
            }}
          />
          <button
            onClick={addWeight}
            disabled={isSaving || !weightInput}
            className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
          >
            Add
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
