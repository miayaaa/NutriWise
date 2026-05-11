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

const WORKOUT_MODES: { value: WorkoutMode; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "other", label: "Other" },
]

const CARDIO_PRESETS = [
  "Rowing",
  "Incline Walk",
  "Treadmill",
  "Outdoor Run",
  "Stair Climber",
  "Cycling",
  "Elliptical",
  "Swimming",
  "Hiking",
  "Other",
]

interface WorkoutLogFormProps {
  onSuccess?: () => void
}

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

export function WorkoutLogForm({ onSuccess }: WorkoutLogFormProps) {
  const router = useRouter()
  const [mode, setMode] = React.useState<WorkoutMode>("strength")

  const [exerciseName, setExerciseName] = React.useState("")
  const [setRows, setSetRows] = React.useState<SetRow[]>([{ reps: "", weightKg: "" }])
  const [restSec, setRestSec] = React.useState("")

  const [cardioType, setCardioType] = React.useState("Treadmill")
  const [customCardioType, setCustomCardioType] = React.useState("")
  const [machineKcal, setMachineKcal] = React.useState("")
  const [showCardioDetails, setShowCardioDetails] = React.useState(false)
  const [distanceKm, setDistanceKm] = React.useState("")
  const [avgSpeedKph, setAvgSpeedKph] = React.useState("")
  const [inclinePct, setInclinePct] = React.useState("")
  const [elevationGainM, setElevationGainM] = React.useState("")

  const [otherType, setOtherType] = React.useState("")
  const [durationMin, setDurationMin] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [isLogging, setIsLogging] = React.useState(false)
  const [aiComment, setAiComment] = React.useState<string | null>(null)

  const selectedCardioType = cardioType === "Other" ? customCardioType.trim() : cardioType
  const duration = Number(durationMin)

  const canLogStrength =
    exerciseName.trim().length > 0 &&
    setRows.length > 0 &&
    setRows.every((r) => Number(r.reps) > 0) &&
    Number(durationMin) > 0

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
  const canLogCardio = selectedCardioType.length > 0 && Number(durationMin) > 0
  const canLogOther = otherType.trim().length > 0 && Number(durationMin) > 0
  const canLog =
    !isLogging &&
    (mode === "strength" ? canLogStrength : mode === "cardio" ? canLogCardio : canLogOther)

  function getWorkoutTypeLabel() {
    if (mode === "strength") return exerciseName.trim() || "Strength Training"
    if (mode === "cardio") return selectedCardioType || "Cardio"
    return otherType.trim() || "Workout"
  }

  function resetForm() {
    setMode("strength")
    setExerciseName("")
    setSetRows([{ reps: "", weightKg: "" }])
    setRestSec("")
    setCardioType("Treadmill")
    setCustomCardioType("")
    setMachineKcal("")
    setShowCardioDetails(false)
    setDistanceKm("")
    setAvgSpeedKph("")
    setInclinePct("")
    setElevationGainM("")
    setOtherType("")
    setDurationMin("")
    setNotes("")
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
          restSec: restSec ? Number(restSec) : undefined,
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

    return {
      mode,
      other: {
        workoutName: otherType.trim(),
      },
    }
  }

  async function handleLog() {
    if (!canLog) return
    setIsLogging(true)
    setAiComment(null)

    const workoutType = getWorkoutTypeLabel()
    const analysisContext = buildAnalysisContext()
    const trimmedNotes = notes.trim()

    try {
      const res = await fetch("/api/workout-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: workoutType,
          durationMin: duration,
          notes: trimmedNotes || undefined,
          analysisContext,
        }),
      })
      if (!res.ok) {
        toast({ title: "Error", description: "Could not save workout.", variant: "destructive" })
        return
      }
      const result = await res.json()
      if (result.aiComment) setAiComment(result.aiComment)
      toast({ description: `${workoutType} ${duration} min logged.` })
      resetForm()
      router.refresh()
      if (result.aiComment) {
        setTimeout(() => {
          setAiComment(null)
          onSuccess?.()
        }, 3000)
      } else {
        onSuccess?.()
      }
    } finally {
      setIsLogging(false)
    }
  }

  function handleTemplateFillStrength(data: { name: string; sets: number; reps: number; weightKg?: number; durationMin?: number }) {
    setMode("strength")
    setExerciseName(data.name)
    setSetRows(
      Array.from({ length: data.sets }, () => ({
        reps: String(data.reps),
        weightKg: data.weightKg ? String(data.weightKg) : "",
      }))
    )
    if (data.durationMin) setDurationMin(String(data.durationMin))
  }

  function handleTemplateFillCardio(data: { cardioType: string; inclinePct?: number; durationMin: number }) {
    setMode("cardio")
    const preset = CARDIO_PRESETS.includes(data.cardioType) ? data.cardioType : "Other"
    setCardioType(preset)
    if (preset === "Other") setCustomCardioType(data.cardioType)
    if (data.inclinePct !== undefined) setInclinePct(String(data.inclinePct))
    setDurationMin(String(data.durationMin))
  }

  return (
    <div className="space-y-4 pb-2">
      {/* Template quick-start panel */}
      <WorkoutTemplatePanel
        onFillStrength={handleTemplateFillStrength}
        onFillCardio={handleTemplateFillCardio}
      />

      {/* Workout mode */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Workout category</p>
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

      {mode === "strength" && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <p className="text-sm font-medium">Strength details</p>
          <Input
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            placeholder="Exercise (e.g. Barbell Squat)"
          />
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
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={1000}
                  step="0.5"
                  value={row.weightKg}
                  onChange={(e) => updateSet(i, "weightKg", e.target.value)}
                  placeholder="kg"
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={200}
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
            <button
              type="button"
              onClick={addSet}
              className="text-xs text-primary hover:text-primary/70 transition-colors pt-0.5"
            >
              + Add Set
            </button>
          </div>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            max={600}
            value={restSec}
            onChange={(e) => setRestSec(e.target.value)}
            placeholder="Rest between sets (sec, optional)"
          />
        </div>
      )}

      {mode === "cardio" && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <p className="text-sm font-medium">Cardio details</p>
          <div className="flex flex-wrap gap-2">
            {CARDIO_PRESETS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setCardioType(t)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                  cardioType === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          {cardioType === "Other" && (
            <Input
              value={customCardioType}
              onChange={(e) => setCustomCardioType(e.target.value)}
              placeholder="Custom cardio type"
            />
          )}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Machine calories (kcal) <span className="text-muted-foreground/60">— from display screen, optional</span></p>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={5000}
              value={machineKcal}
              onChange={(e) => setMachineKcal(e.target.value)}
              placeholder="e.g. 211"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCardioDetails((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showCardioDetails ? "▲ Hide details" : "▼ More details (distance, speed, incline)"}
          </button>
          {showCardioDetails && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Distance (km)</p>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={200}
                  step="0.1"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="5.0"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Speed (km/h)</p>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={80}
                  step="0.1"
                  value={avgSpeedKph}
                  onChange={(e) => setAvgSpeedKph(e.target.value)}
                  placeholder="10.0"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Incline (%)</p>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={30}
                  step="0.5"
                  value={inclinePct}
                  onChange={(e) => setInclinePct(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Elevation gain (m)</p>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={10000}
                  value={elevationGainM}
                  onChange={(e) => setElevationGainM(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "other" && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <p className="text-sm font-medium">Custom workout</p>
          <Input
            value={otherType}
            onChange={(e) => setOtherType(e.target.value)}
            placeholder="Workout name"
          />
        </div>
      )}

      {/* Duration */}
      <div className="space-y-1">
        <p className="text-sm font-medium">Duration (minutes)</p>
        <Input
          type="number"
          inputMode="decimal"
          min={1}
          max={600}
          value={durationMin}
          onChange={(e) => setDurationMin(e.target.value)}
          placeholder="e.g. 45"
          className="w-full sm:w-32"
        />
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Notes (optional)</p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any extra context: RPE, how you felt, pain signals, etc."
          rows={3}
        />
      </div>

      {/* AI comment after logging */}
      {aiComment && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm italic text-foreground/80 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {aiComment}
        </div>
      )}

      <Button onClick={handleLog} disabled={!canLog} className="w-full">
        {isLogging ? (
          <><Icons.spinner className="mr-2 h-4 w-4 animate-spin" />Logging...</>
        ) : (
          <><Icons.add className="mr-2 h-4 w-4" />Save Workout</>
        )}
      </Button>
    </div>
  )
}
