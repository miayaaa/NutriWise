"use client"

import { useRouter } from "next/navigation"
import { Icons } from "@/components/icons"
import { WorkoutLogForm } from "@/components/pages/dashboard/workout-log-form"

export default function LogWorkoutPage() {
  const router = useRouter()

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icons.back className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-lg font-semibold">Log Workout</h1>
      </div>
      <WorkoutLogForm onSuccess={() => router.push("/dashboard")} />
    </div>
  )
}
