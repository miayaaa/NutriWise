"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icons } from "@/components/icons"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"

type WorkoutMode = "strength" | "cardio" | "other"

const WORKOUT_MODES: { value: WorkoutMode; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "other", label: "Other" },
]

const CARDIO_PRESETS = [
  "Treadmill",
  "Outdoor Run",
  "Incline Walk",
  "Stair Climber",
  "Cycling",
  "Elliptical",
  "Rowing",
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
    sets: number
    reps: number
    weightKg?: number
    restSec?: number
  }
  cardio?: {
    cardioType: string
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
  const [sets, setSets] = React.useState("")
  const [reps, setReps] = React.useState("")
  const [weightKg, setWeightKg] = React.useState("")
  const [restSec, setRestSec] = React.useState("")

  const [cardioType, setCardioType] = React.useState("Treadmill")
  const [customCardioType, setCustomCardioType] = React.useState("")
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
    Number(sets) > 0 &&
    Number(reps) > 0 &&
    Number(durationMin) > 0
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
    setSets("")
    setReps("")
    setWeightKg("")
    setRestSec("")
    setCardioType("Treadmill")
    setCustomCardioType("")
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
          sets: Number(sets),
          reps: Number(reps),
          weightKg: weightKg ? Number(weightKg) : undefined,
          restSec: restSec ? Number(restSec) : undefined,
        },
      }
    }

    if (mode === "cardio") {
      return {
        mode,
        cardio: {
          cardioType: selectedCardioType,
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

  return (
    <div className="space-y-4">
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
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min={1}
              max={50}
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              placeholder="Sets"
            />
            <Input
              type="number"
              inputMode="decimal"
              min={1}
              max={100}
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="Reps"
            />
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={1000}
              step="0.5"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="kg"
            />
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
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={200}
              step="0.1"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              placeholder="Distance (km)"
            />
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={80}
              step="0.1"
              value={avgSpeedKph}
              onChange={(e) => setAvgSpeedKph(e.target.value)}
              placeholder="Speed (km/h)"
            />
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={30}
              step="0.5"
              value={inclinePct}
              onChange={(e) => setInclinePct(e.target.value)}
              placeholder="Incline (%)"
            />
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={10000}
              value={elevationGainM}
              onChange={(e) => setElevationGainM(e.target.value)}
              placeholder="Elevation (m)"
            />
          </div>
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

      <div className="flex justify-end">
        <Button onClick={handleLog} disabled={!canLog} size="sm">
          {isLogging ? (
            <><Icons.spinner className="mr-2 h-4 w-4 animate-spin" />Logging...</>
          ) : (
            <><Icons.add className="mr-2 h-4 w-4" />Save Workout</>
          )}
        </Button>
      </div>
    </div>
  )
}
