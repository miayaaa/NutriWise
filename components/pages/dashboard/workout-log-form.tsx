"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icons } from "@/components/icons"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { WorkoutTemplatePanel } from "@/components/pages/dashboard/workout-template-panel"

type WorkoutMode = "strength" | "cardio" | "other"
type SetRow = { reps: string; weightKg: string }

type WorkoutAnalysisContext = {
  mode: WorkoutMode
  strength?: {
    exercise: string
    setRows: Array<{ reps: number; weightKg?: number }>
    restSec?: number
  }
  cardio?: {
    cardioType: string
    machineKcal?: number
    distanceKm?: number
    avgSpeedKph?: number
    inclinePct?: number
    elevationGainM?: number
  }
  other?: {
    workoutName: string
  }
}

type SessionItem = {
  id: string
  label: string
  analysisContext: WorkoutAnalysisContext
}

const WORKOUT_MODES: { value: WorkoutMode; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "other", label: "Other" },
]

const CARDIO_PRESETS = [
  "Rowing", "Incline Walk", "Treadmill", "Outdoor Run",
  "Stair Climber", "Cycling", "Elliptical", "Swimming", "Hiking", "Other",
]

interface WorkoutLogFormProps {
  onSuccess?: () => void
}

function summarizeItem(item: SessionItem): string {
  const ctx = item.analysisContext
  if (ctx.mode === "strength" && ctx.strength) {
    const rows = ctx.strength.setRows
    const setCount = `${rows.length} set${rows.length > 1 ? "s" : ""}`
    const weights = rows.map((r) => r.weightKg).filter((w): w is number => w != null && w > 0)
    if (weights.length === 0) return setCount
    const min = Math.min(...weights), max = Math.max(...weights)
    return `${setCount} · ${min === max ? `${min}kg` : `${min}–${max}kg`}`
  }
  if (ctx.mode === "cardio" && ctx.cardio) {
    const parts: string[] = []
    if (ctx.cardio.distanceKm) parts.push(`${ctx.cardio.distanceKm}km`)
    if (ctx.cardio.machineKcal) parts.push(`${ctx.cardio.machineKcal}kcal`)
    return parts.join(" · ")
  }
  return ""
}

export function WorkoutLogForm({ onSuccess }: WorkoutLogFormProps) {
  const router = useRouter()

  // Session state
  const [session, setSession] = React.useState<SessionItem[]>([])

  // Exercise form state
  const [mode, setMode] = React.useState<WorkoutMode>("strength")
  const [exerciseName, setExerciseName] = React.useState("")
  const [setRows, setSetRows] = React.useState<SetRow[]>([{ reps: "", weightKg: "" }])
  const [restSec, setRestSec] = React.useState("")
  const [prefilled, setPrefilled] = React.useState(false)

  const [cardioType, setCardioType] = React.useState("Treadmill")
  const [customCardioType, setCustomCardioType] = React.useState("")
  const [machineKcal, setMachineKcal] = React.useState("")
  const [showCardioDetails, setShowCardioDetails] = React.useState(false)
  const [distanceKm, setDistanceKm] = React.useState("")
  const [avgSpeedKph, setAvgSpeedKph] = React.useState("")
  const [inclinePct, setInclinePct] = React.useState("")
  const [elevationGainM, setElevationGainM] = React.useState("")

  const [otherType, setOtherType] = React.useState("")

  // Session-level state
  const [durationMin, setDurationMin] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [isLogging, setIsLogging] = React.useState(false)

  const selectedCardioType = cardioType === "Other" ? customCardioType.trim() : cardioType

  // Per-exercise readiness (no duration required — that's session-level)
  const exerciseReady =
    mode === "strength"
      ? exerciseName.trim().length > 0 && setRows.length > 0 && setRows.every((r) => Number(r.reps) > 0)
      : mode === "cardio"
        ? selectedCardioType.length > 0
        : otherType.trim().length > 0

  const canAdd = exerciseReady && !isLogging
  const canSave = session.length > 0 && Number(durationMin) > 0 && !isLogging

  // Set row helpers
  function addSet() {
    const last = setRows[setRows.length - 1]
    setSetRows((prev) => [...prev, { reps: last?.reps ?? "", weightKg: last?.weightKg ?? "" }])
  }
  function removeSet(i: number) {
    setSetRows((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))
  }
  function updateSet(i: number, field: keyof SetRow, value: string) {
    setSetRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)))
  }

  function getExerciseLabel(): string {
    if (mode === "strength") return exerciseName.trim() || "Strength"
    if (mode === "cardio") return selectedCardioType || "Cardio"
    return otherType.trim() || "Workout"
  }

  function buildAnalysisContext(): WorkoutAnalysisContext {
    if (mode === "strength") {
      return {
        mode,
        strength: {
          exercise: exerciseName.trim(),
          setRows: setRows.map((r) => ({
            reps: Number(r.reps),
            weightKg: r.weightKg ? Number(r.weightKg) : undefined,
          })),
          restSec: restSec ? Math.round(Number(restSec)) : undefined,
        },
      }
    }
    if (mode === "cardio") {
      return {
        mode,
        cardio: {
          cardioType: selectedCardioType,
          machineKcal: machineKcal ? Number(machineKcal) : undefined,
          distanceKm: distanceKm ? Number(distanceKm) : undefined,
          avgSpeedKph: avgSpeedKph ? Number(avgSpeedKph) : undefined,
          inclinePct: inclinePct ? Number(inclinePct) : undefined,
          elevationGainM: elevationGainM ? Number(elevationGainM) : undefined,
        },
      }
    }
    return { mode, other: { workoutName: otherType.trim() } }
  }

  async function lookupLastPerf(name: string) {
    try {
      const res = await fetch(`/api/workout-logs/last-performance?exercises=${encodeURIComponent(name)}`)
      if (!res.ok) return
      const data = await res.json() as Record<string, { setRows?: Array<{ reps: number; weightKg?: number }>; sets?: number; reps?: number; weightKg?: number }>
      const perf = data[name] ?? data[Object.keys(data)[0]]
      if (!perf) return
      if (perf.setRows && perf.setRows.length > 0) {
        setSetRows(perf.setRows.map((r) => ({ reps: String(r.reps), weightKg: r.weightKg ? String(r.weightKg) : "" })))
      } else if (perf.sets && perf.reps) {
        setSetRows(Array.from({ length: perf.sets }, () => ({ reps: String(perf.reps), weightKg: perf.weightKg ? String(perf.weightKg) : "" })))
      } else {
        return
      }
      setPrefilled(true)
    } catch { /* silent */ }
  }

  function clearExerciseFields() {
    setExerciseName("")
    setSetRows([{ reps: "", weightKg: "" }])
    setRestSec("")
    setPrefilled(false)
    setCardioType("Treadmill")
    setCustomCardioType("")
    setMachineKcal("")
    setShowCardioDetails(false)
    setDistanceKm("")
    setAvgSpeedKph("")
    setInclinePct("")
    setElevationGainM("")
    setOtherType("")
  }

  function resetAll() {
    setSession([])
    clearExerciseFields()
    setDurationMin("")
    setNotes("")
    setMode("strength")
  }

  function handleAddToSession() {
    if (!canAdd) return
    const item: SessionItem = {
      id: Math.random().toString(36).slice(2),
      label: getExerciseLabel(),
      analysisContext: buildAnalysisContext(),
    }
    setSession((prev) => [...prev, item])
    clearExerciseFields()
  }

  function removeFromSession(id: string) {
    setSession((prev) => prev.filter((item) => item.id !== id))
  }

  async function handleSaveSession() {
    if (!canSave) return
    setIsLogging(true)
    const duration = Number(durationMin)
    const trimmedNotes = notes.trim()

    try {
      const durationInt = Math.round(duration)
      const results = await Promise.all(
        session.map((item) =>
          fetch("/api/workout-logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: item.label,
              durationMin: durationInt,
              notes: trimmedNotes || undefined,
              analysisContext: item.analysisContext,
            }),
          })
        )
      )

      const failed = results.filter((r) => !r.ok)
      if (failed.length > 0) {
        const bodies = await Promise.all(failed.map((r) => r.text().catch(() => "")))
        console.error("Workout save errors:", bodies)
        toast({ title: "Error", description: "Some exercises could not be saved.", variant: "destructive" })
        return
      }

      const n = session.length
      toast({ description: `${n} exercise${n > 1 ? "s" : ""} logged · ${duration} min session.` })
      resetAll()
      router.refresh()
      onSuccess?.()
    } finally {
      setIsLogging(false)
    }
  }

  function handleTemplateFillStrength(data: {
    name: string; sets: number; reps: number
    weightKg?: number; setRows?: Array<{ reps: number; weightKg?: number }>; durationMin?: number
  }) {
    setMode("strength")
    setExerciseName(data.name)
    if (data.setRows && data.setRows.length > 0) {
      setSetRows(data.setRows.map((r) => ({ reps: String(r.reps), weightKg: r.weightKg ? String(r.weightKg) : "" })))
      setPrefilled(true)
    } else {
      setSetRows(Array.from({ length: data.sets }, () => ({ reps: String(data.reps), weightKg: data.weightKg ? String(data.weightKg) : "" })))
      setPrefilled(!!data.weightKg)
    }
    if (data.durationMin && !durationMin) setDurationMin(String(data.durationMin))
  }

  function handleTemplateFillCardio(data: { cardioType: string; inclinePct?: number; durationMin: number }) {
    setMode("cardio")
    const preset = CARDIO_PRESETS.includes(data.cardioType) ? data.cardioType : "Other"
    setCardioType(preset)
    if (preset === "Other") setCustomCardioType(data.cardioType)
    if (data.inclinePct !== undefined) setInclinePct(String(data.inclinePct))
    if (!durationMin) setDurationMin(String(data.durationMin))
  }

  return (
    <div className="space-y-4 pb-2">
      {/* Session list */}
      {session.length > 0 && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Session · {session.length} exercise{session.length > 1 ? "s" : ""}
          </p>
          {session.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-sm font-medium">{item.label}</span>
                {summarizeItem(item) && (
                  <span className="ml-2 text-xs text-muted-foreground">{summarizeItem(item)}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeFromSession(item.id)}
                className="shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Template quick-start panel */}
      <WorkoutTemplatePanel
        onFillStrength={handleTemplateFillStrength}
        onFillCardio={handleTemplateFillCardio}
      />

      {/* Mode selector */}
      <div className="space-y-2">
        <p className="text-sm font-medium">
          {session.length > 0 ? "Add another exercise" : "Workout category"}
        </p>
        <div className="flex flex-wrap gap-2">
          {WORKOUT_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                mode === m.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Strength */}
      {mode === "strength" && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <p className="text-sm font-medium">Strength details</p>
          <div className="space-y-1">
            <Input
              value={exerciseName}
              onChange={(e) => { setExerciseName(e.target.value); setPrefilled(false) }}
              onBlur={() => { if (exerciseName.trim()) void lookupLastPerf(exerciseName.trim()) }}
              placeholder="Exercise (e.g. Barbell Squat)"
            />
            {prefilled && (
              <p className="text-xs text-muted-foreground pl-0.5">↑ pre-filled from last session</p>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] gap-2 px-0.5">
              <span className="text-xs text-muted-foreground text-center">#</span>
              <span className="text-xs text-muted-foreground">Weight (kg)</span>
              <span className="text-xs text-muted-foreground">Reps</span>
              <span />
            </div>
            {setRows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] gap-2 items-center">
                <span className="text-xs text-center text-muted-foreground">{i + 1}</span>
                <Input
                  type="number" inputMode="decimal" min={0} max={1000} step="0.5"
                  value={row.weightKg}
                  onChange={(e) => updateSet(i, "weightKg", e.target.value)}
                  placeholder="kg"
                />
                <Input
                  type="number" inputMode="numeric" min={1} max={200}
                  value={row.reps}
                  onChange={(e) => updateSet(i, "reps", e.target.value)}
                  placeholder="reps"
                />
                <button
                  type="button"
                  onClick={() => removeSet(i)}
                  disabled={setRows.length === 1}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-25 transition-colors text-sm leading-none"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={addSet} className="text-xs text-primary hover:text-primary/70 transition-colors pt-0.5">
              + Add Set
            </button>
          </div>
          <Input
            type="number" inputMode="decimal" min={0} max={600}
            value={restSec}
            onChange={(e) => setRestSec(e.target.value)}
            placeholder="Rest between sets (sec, optional)"
          />
        </div>
      )}

      {/* Cardio */}
      {mode === "cardio" && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <p className="text-sm font-medium">Cardio details</p>
          <div className="flex flex-wrap gap-2">
            {CARDIO_PRESETS.map((t) => (
              <button
                key={t} type="button" onClick={() => setCardioType(t)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                  cardioType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          {cardioType === "Other" && (
            <Input value={customCardioType} onChange={(e) => setCustomCardioType(e.target.value)} placeholder="Custom cardio type" />
          )}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Machine calories (kcal) <span className="text-muted-foreground/60">— optional</span></p>
            <Input type="number" inputMode="numeric" min={0} max={5000} value={machineKcal} onChange={(e) => setMachineKcal(e.target.value)} placeholder="e.g. 211" />
          </div>
          <button type="button" onClick={() => setShowCardioDetails((v) => !v)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {showCardioDetails ? "▲ Hide details" : "▼ More details (distance, speed, incline)"}
          </button>
          {showCardioDetails && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Distance (km)</p>
                <Input type="number" inputMode="decimal" min={0} max={200} step="0.1" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} placeholder="5.0" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Speed (km/h)</p>
                <Input type="number" inputMode="decimal" min={0} max={80} step="0.1" value={avgSpeedKph} onChange={(e) => setAvgSpeedKph(e.target.value)} placeholder="10.0" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Incline (%)</p>
                <Input type="number" inputMode="decimal" min={0} max={30} step="0.5" value={inclinePct} onChange={(e) => setInclinePct(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Elevation gain (m)</p>
                <Input type="number" inputMode="decimal" min={0} max={10000} value={elevationGainM} onChange={(e) => setElevationGainM(e.target.value)} placeholder="0" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Other */}
      {mode === "other" && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <p className="text-sm font-medium">Custom workout</p>
          <Input value={otherType} onChange={(e) => setOtherType(e.target.value)} placeholder="Workout name" />
        </div>
      )}

      {/* Add to session button */}
      <Button
        type="button"
        variant={session.length > 0 ? "outline" : "default"}
        onClick={handleAddToSession}
        disabled={!canAdd}
        className="w-full"
      >
        <Icons.add className="mr-2 h-4 w-4" />
        {session.length > 0 ? "Add Another Exercise" : "Add to Session"}
      </Button>

      {/* Session-level: duration + notes + save */}
      {session.length > 0 && (
        <>
          <div className="space-y-1">
            <p className="text-sm font-medium">Total session duration (minutes)</p>
            <Input
              type="number" inputMode="numeric" min={1} max={600}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              placeholder="e.g. 60"
              className="w-full sm:w-32"
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Notes (optional)</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="RPE, how you felt, pain signals, etc."
              rows={2}
            />
          </div>
          <Button onClick={handleSaveSession} disabled={!canSave} className="w-full">
            {isLogging
              ? <><Icons.spinner className="mr-2 h-4 w-4 animate-spin" />Saving…</>
              : <>
                  <Icons.check className="mr-2 h-4 w-4" />
                  Save Session ({session.length} exercise{session.length > 1 ? "s" : ""})
                </>
            }
          </Button>
        </>
      )}

    </div>
  )
}
