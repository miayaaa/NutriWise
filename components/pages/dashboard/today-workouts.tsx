"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BsFire } from "react-icons/bs"

type WorkoutDetails =
  | {
      mode: "strength"
      strength: {
        exercise: string
        sets: number
        reps: number
        weightKg?: number
        restSec?: number
      }
    }
  | {
      mode: "cardio"
      cardio: {
        cardioType: string
        distanceKm?: number
        avgSpeedKph?: number
        inclinePct?: number
        elevationGainM?: number
      }
    }
  | {
      mode: "other"
      other: {
        workoutName: string
      }
    }

interface WorkoutLog {
  id: string
  type: string
  durationMin: number
  details: unknown
  notes: string | null
  aiComment: string | null
}

interface TodayWorkoutsProps {
  workouts: WorkoutLog[]
}

function formatWorkoutDetails(details: unknown): string | null {
  if (!details || typeof details !== "object") return null
  const d = details as Partial<WorkoutDetails>

  if (d.mode === "strength" && d.strength) {
    const s = d.strength
    const parts = [`${s.sets} x ${s.reps}`]
    if (typeof s.weightKg === "number") parts.push(`${s.weightKg} kg`)
    if (typeof s.restSec === "number") parts.push(`rest ${s.restSec}s`)
    return `Strength: ${parts.join(" · ")}`
  }

  if (d.mode === "cardio" && d.cardio) {
    const c = d.cardio
    const parts = [c.cardioType]
    if (typeof c.distanceKm === "number") parts.push(`${c.distanceKm} km`)
    if (typeof c.avgSpeedKph === "number") parts.push(`${c.avgSpeedKph} km/h`)
    if (typeof c.inclinePct === "number") parts.push(`incline ${c.inclinePct}%`)
    if (typeof c.elevationGainM === "number") parts.push(`+${c.elevationGainM} m`)
    return `Cardio: ${parts.join(" · ")}`
  }

  if (d.mode === "other" && d.other?.workoutName) {
    return `Other: ${d.other.workoutName}`
  }

  return null
}

export function TodayWorkouts({ workouts }: TodayWorkoutsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-medium">Today&apos;s Workouts</CardTitle>
          <BsFire className="h-4 w-4 text-orange-400" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {workouts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No workout logged today yet.
          </p>
        )}
        {workouts.map((w) => {
          const detailsSummary = formatWorkoutDetails(w.details)
          return (
            <div key={w.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-base">{w.type}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{w.durationMin} min</span>
              </div>
              {detailsSummary && (
                <p className="text-sm text-muted-foreground pl-1">{detailsSummary}</p>
              )}
              {w.notes && (
                <p className="text-sm text-muted-foreground whitespace-pre-line pl-1">{w.notes}</p>
              )}
              {w.aiComment && (
                <p className="text-sm italic text-muted-foreground border-l-2 border-orange-300 pl-2">
                  {w.aiComment}
                </p>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
