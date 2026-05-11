"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TemplateExercise {
  name: string
  sets: number
  reps: string        // "10" | "12-15" | "40秒"
  notes?: string
  isCardio?: boolean
  cardioMin?: number
}

export interface WorkoutTemplateData {
  id: string
  name: string
  cycleDay?: number | null
  exercises: TemplateExercise[]
}

// Default 4-day plan — used when user has no saved templates
const DEFAULT_TEMPLATES: Omit<WorkoutTemplateData, "id">[] = [
  {
    name: "Day 1 · Lower Body – Glutes & Legs",
    cycleDay: 1,
    exercises: [
      { name: "Squat", sets: 4, reps: "10", notes: "Last 2 reps tough" },
      { name: "RDL", sets: 4, reps: "10", notes: "Feel the stretch" },
      { name: "Hip Thrust", sets: 4, reps: "12", notes: "1s pause at top" },
      { name: "Hip Abduction", sets: 3, reps: "15-20" },
      { name: "Plank", sets: 3, reps: "40s" },
      { name: "Incline Walk", sets: 1, reps: "20min", isCardio: true, cardioMin: 20, notes: "Incline 6-10" },
    ],
  },
  {
    name: "Day 2 · Upper Body – Core",
    cycleDay: 2,
    exercises: [
      { name: "Lat Pulldown", sets: 3, reps: "10-12" },
      { name: "Row", sets: 3, reps: "10-12" },
      { name: "Assisted Pull-up", sets: 3, reps: "To failure" },
      { name: "Reverse Fly", sets: 3, reps: "12" },
      { name: "Dead Bug", sets: 3, reps: "12", notes: "Slow" },
      { name: "Incline Walk", sets: 1, reps: "15min", isCardio: true, cardioMin: 15 },
    ],
  },
  {
    name: "Day 3 · Glute Focus",
    cycleDay: 3,
    exercises: [
      { name: "Bulgarian Split Squat", sets: 3, reps: "10/leg" },
      { name: "RDL", sets: 3, reps: "10" },
      { name: "Hip Thrust", sets: 4, reps: "10", notes: "2s pause at top" },
      { name: "Glute Bridge", sets: 3, reps: "12", notes: "Squeeze" },
      { name: "Reverse Crunch", sets: 3, reps: "12" },
      { name: "Incline Walk", sets: 1, reps: "20-25min", isCardio: true, cardioMin: 22 },
    ],
  },
  {
    name: "Day 4 · Fat Burn Sprint",
    cycleDay: 4,
    exercises: [
      { name: "Incline Warm-up", sets: 1, reps: "10min", isCardio: true, cardioMin: 10 },
      { name: "Sprint Intervals", sets: 7, reps: "30s sprint + 1min walk", isCardio: true, cardioMin: 12, notes: "6-8 rounds" },
    ],
  },
]

const DAY_COLORS = [
  { bg: "bg-emerald-50 dark:bg-emerald-950/40", ring: "ring-emerald-400", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  { bg: "bg-blue-50 dark:bg-blue-950/40", ring: "ring-blue-400", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
  { bg: "bg-purple-50 dark:bg-purple-950/40", ring: "ring-purple-400", text: "text-purple-700 dark:text-purple-400", dot: "bg-purple-500" },
  { bg: "bg-red-50 dark:bg-red-950/40", ring: "ring-red-400", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
]

type SetRow = { reps: number; weightKg?: number }
type LastPerf = Record<string, { weightKg?: number; sets: number; reps: number; setRows?: SetRow[]; date: string }>

interface WorkoutTemplatePanelProps {
  onFillStrength: (data: { name: string; sets: number; reps: number; weightKg?: number; setRows?: SetRow[]; durationMin?: number }) => void
  onFillCardio: (data: { cardioType: string; inclinePct?: number; durationMin: number }) => void
}

export function WorkoutTemplatePanel({ onFillStrength, onFillCardio }: WorkoutTemplatePanelProps) {
  const [templates, setTemplates] = React.useState<WorkoutTemplateData[] | null>(null)
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null)
  const [lastPerf, setLastPerf] = React.useState<LastPerf>({})
  const [loadingPerf, setLoadingPerf] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)

  // Determine the recommended next day based on last workout type
  const [suggestedDay, setSuggestedDay] = React.useState<number | null>(null)

  const displayTemplates = templates && templates.length > 0 ? templates : DEFAULT_TEMPLATES.map((t, i) => ({ ...t, id: `default-${i}` }))

  // Fetch templates + suggested next day on first open
  React.useEffect(() => {
    if (!isOpen || templates !== null) return

    async function load() {
      try {
        const [tRes, wRes] = await Promise.all([
          fetch("/api/workout-templates"),
          fetch("/api/workout-logs?limit=10"),
        ])
        if (tRes.ok) {
          const data = await tRes.json()
          setTemplates(data)
        } else {
          setTemplates([])
        }
        if (wRes.ok) {
          const workouts: Array<{ type: string; details?: { templateCycleDay?: number } }> = await wRes.json()
          const lastWithCycle = workouts.find((w) => w.details && typeof (w.details as Record<string, unknown>).templateCycleDay === "number")
          if (lastWithCycle) {
            const lastDay = (lastWithCycle.details as Record<string, unknown>).templateCycleDay as number
            setSuggestedDay((lastDay % 4) + 1)
          }
        }
      } catch {
        setTemplates([])
      }
    }
    void load()
  }, [isOpen, templates])

  // Fetch last performance when a day is selected
  React.useEffect(() => {
    if (selectedDay === null) return
    const tmpl = displayTemplates.find((t) => t.cycleDay === selectedDay)
    if (!tmpl) return

    const strengthExercises = tmpl.exercises
      .filter((e) => !e.isCardio)
      .map((e) => e.name)
    if (strengthExercises.length === 0) return

    setLoadingPerf(true)
    fetch(`/api/workout-logs/last-performance?exercises=${encodeURIComponent(strengthExercises.join(","))}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: LastPerf) => setLastPerf(data))
      .catch(() => {})
      .finally(() => setLoadingPerf(false))
  }, [selectedDay]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedTemplate = selectedDay !== null
    ? displayTemplates.find((t) => t.cycleDay === selectedDay)
    : null

  function handleExerciseTap(ex: TemplateExercise) {
    if (ex.isCardio) {
      onFillCardio({
        cardioType: ex.name.includes("Incline") ? "Incline Walk" : ex.name,
        inclinePct: ex.name.includes("Incline") ? 8 : undefined,
        durationMin: ex.cardioMin ?? 20,
      })
    } else {
      const repsNum = parseInt(ex.reps) || 10
      const perf = lastPerf[ex.name]
      onFillStrength({
        name: ex.name,
        sets: ex.sets,
        reps: repsNum,
        weightKg: perf?.weightKg,
        setRows: perf?.setRows,
      })
    }
  }

  const colorIdx = (day: number) => (day - 1) % DAY_COLORS.length

  return (
    <div className="rounded-lg border bg-muted/20">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium"
        onClick={() => setIsOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <span>Quick Start · Workout Plan</span>
          {suggestedDay && !isOpen && (
            <span className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              DAY_COLORS[colorIdx(suggestedDay)].bg,
              DAY_COLORS[colorIdx(suggestedDay)].text,
            )}>
              Suggested Day {suggestedDay}
            </span>
          )}
        </span>
        <span className="text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="border-t px-3 pb-3 space-y-3">
          {/* Day selector */}
          <div className="flex flex-wrap gap-2 pt-2">
            {displayTemplates.map((tmpl, i) => {
              const day = tmpl.cycleDay ?? (i + 1)
              const col = DAY_COLORS[colorIdx(day)]
              const isSelected = selectedDay === day
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-all ring-1 ring-transparent",
                    col.bg,
                    col.text,
                    isSelected && cn("ring-2", col.ring),
                    day === suggestedDay && !isSelected && "ring-1 ring-dashed",
                    col.ring,
                  )}
                >
                  {tmpl.name.split("·")[0].trim()}
                  {day === suggestedDay && (
                    <span className="ml-1 opacity-60">←</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Exercise list */}
          {selectedTemplate && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground pb-1">
                Tap exercise → auto-fill form
                {loadingPerf && <span className="ml-2 opacity-60">Loading last session...</span>}
              </p>
              {selectedTemplate.exercises.map((ex, i) => {
                const perf = !ex.isCardio ? lastPerf[ex.name] : undefined
                const col = DAY_COLORS[colorIdx(selectedTemplate.cycleDay ?? 1)]
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleExerciseTap(ex)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60 active:scale-[0.98]",
                      ex.isCardio ? "bg-muted/30" : "bg-background border"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", col.dot)} />
                      <div>
                        <span className="font-medium">{ex.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {ex.isCardio ? ex.reps : `${ex.sets}×${ex.reps}`}
                        </span>
                        {ex.notes && (
                          <span className="ml-1 text-xs text-muted-foreground/60">{ex.notes}</span>
                        )}
                      </div>
                    </div>
                    {perf && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {perf.setRows
                          ? `Last ${perf.setRows.map((r) => `${r.weightKg ?? "–"}×${r.reps}`).join(", ")}`
                          : `Last${perf.weightKg ? ` ${perf.weightKg}kg` : ` ${perf.sets}×${perf.reps}`}`}
                      </span>
                    )}
                    {ex.isCardio && (
                      <span className="shrink-0 text-xs text-muted-foreground/60">Cardio</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
