"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface BodyMeasurement {
  id: string
  waistCm?: number | null
  hipCm?: number | null
  feelScore?: number | null
  notes?: string | null
  date: string | Date
}

interface WaistTrackerProps {
  initialLogs: BodyMeasurement[]
  waistGoalCm?: number | null
}

const FEEL_OPTIONS: { score: number; emoji: string; label: string }[] = [
  { score: 1, emoji: "😞", label: "Poor" },
  { score: 2, emoji: "😕", label: "Fair" },
  { score: 3, emoji: "😐", label: "OK" },
  { score: 4, emoji: "😊", label: "Good" },
  { score: 5, emoji: "🔥", label: "Crushed it" },
]

export function WaistTracker({ initialLogs, waistGoalCm }: WaistTrackerProps) {
  const [logs, setLogs] = React.useState<BodyMeasurement[]>(
    initialLogs.map((x) => ({ ...x, date: new Date(x.date) }))
  )
  const [isOpen, setIsOpen] = React.useState(false)
  const [waistInput, setWaistInput] = React.useState("")
  const [feelScore, setFeelScore] = React.useState<number | null>(null)
  const [notes, setNotes] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  const sorted = [...logs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const latest = sorted[0]

  const waistLogs = sorted.filter((l) => l.waistCm != null)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  const recent = waistLogs.filter((l) => new Date(l.date) >= thirtyDaysAgo)
  const delta30 =
    recent.length >= 2
      ? recent[recent.length - 1].waistCm! - recent[0].waistCm!
      : null

  const latestFeel = sorted.find((l) => l.feelScore != null)

  // Suggest check-in if last entry was 5+ days ago
  const daysSinceLast = latest
    ? Math.floor((Date.now() - new Date(latest.date).getTime()) / 86400000)
    : Infinity
  const isDue = daysSinceLast >= 5

  async function handleSave() {
    if (isSaving) return
    const waist = waistInput ? Number(waistInput) : undefined
    if (waist !== undefined && (waist < 30 || waist > 250 || !Number.isFinite(waist))) {
      toast({ title: "Invalid input", description: "Waist must be 30–250 cm", variant: "destructive" })
      return
    }
    if (!waist && !feelScore && !notes.trim()) {
      toast({ description: "Enter at least one field" })
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch("/api/body-measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waistCm: waist,
          feelScore: feelScore ?? undefined,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        toast({ title: "Save failed", variant: "destructive" })
        return
      }
      const log = await res.json()
      setLogs((prev) => [...prev, { ...log, date: new Date(log.date) }])
      setWaistInput("")
      setFeelScore(null)
      setNotes("")
      setIsOpen(false)
      toast({ description: "Check-in saved" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className={cn(isDue && "ring-1 ring-primary/30")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Weekly Check-in</CardTitle>
        {isDue && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
            Due
          </span>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Latest stats row */}
        <div className="flex items-end gap-4">
          <div>
            <span className="text-3xl font-bold tabular-nums">
              {waistLogs[0]?.waistCm?.toFixed(1) ?? "--"}
            </span>
            <span className="ml-1 text-sm text-muted-foreground">cm</span>
            {waistGoalCm && waistLogs[0]?.waistCm != null && (
              <p className="text-xs text-muted-foreground">
                {(waistLogs[0].waistCm - waistGoalCm).toFixed(1)} cm to goal
              </p>
            )}
          </div>
          {latestFeel?.feelScore != null && (
            <div className="mb-1 text-center">
              <div className="text-xl">
                {FEEL_OPTIONS.find((o) => o.score === latestFeel.feelScore)?.emoji}
              </div>
              <div className="text-xs text-muted-foreground">
                {FEEL_OPTIONS.find((o) => o.score === latestFeel.feelScore)?.label}
              </div>
            </div>
          )}
        </div>

        {/* Trend + last note */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {delta30 !== null
              ? `30-day waist: ${delta30 > 0 ? "+" : ""}${delta30.toFixed(1)} cm`
              : waistLogs.length === 1
              ? "Log again to see trend"
              : "No measurements yet"}
          </p>
          {latest?.notes && (
            <p className="text-xs text-muted-foreground/80 italic truncate">
              「{latest.notes}」
            </p>
          )}
        </div>

        {/* Toggle form */}
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="text-xs text-primary hover:underline font-medium"
        >
          {isOpen ? "▲ Collapse" : "+ Log this week"}
        </button>

        {isOpen && (
          <div className="space-y-3 pt-1">
            {/* Waist input */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Waist cm (morning, fasted)</p>
              <Input
                type="number"
                inputMode="decimal"
                min={30}
                max={250}
                step="0.1"
                value={waistInput}
                onChange={(e) => setWaistInput(e.target.value)}
                placeholder="e.g. 76.5"
                className="w-32"
              />
            </div>

            {/* Feel score */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">How do you feel?</p>
              <div className="flex gap-2">
                {FEEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.score}
                    type="button"
                    title={opt.label}
                    onClick={() => setFeelScore(feelScore === opt.score ? null : opt.score)}
                    className={cn(
                      "flex flex-col items-center rounded-lg px-2 py-1.5 text-base transition-all",
                      feelScore === opt.score
                        ? "bg-primary/15 ring-1 ring-primary/50 scale-110"
                        : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <span>{opt.emoji}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">{opt.score}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Notes (photo location, how you feel, etc.)</p>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Saved as photo #3, glutes looking better this week"
                className="text-sm"
                maxLength={200}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="cursor-pointer rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save check-in"}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
