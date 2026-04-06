"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Credenza,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
} from "@/components/ui/credenza"
import { WorkoutLogForm } from "@/components/pages/dashboard/workout-log-form"

interface WorkoutLogLauncherProps {
  buttonText?: string
}

export function WorkoutLogLauncher({ buttonText = "Add Workout" }: WorkoutLogLauncherProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Credenza open={open} onOpenChange={setOpen}>
      <CredenzaTrigger asChild>
        <Button>{buttonText}</Button>
      </CredenzaTrigger>
      <CredenzaContent className="flex flex-col max-h-[90vh]">
        <CredenzaHeader>
          <CredenzaTitle>Log Workout</CredenzaTitle>
          <CredenzaDescription>
            Track strength sets and weight, cardio metrics like incline, or custom sessions.
          </CredenzaDescription>
        </CredenzaHeader>
        <div className="px-4 pb-6 overflow-y-auto flex-1">
          <WorkoutLogForm onSuccess={() => setOpen(false)} />
        </div>
      </CredenzaContent>
    </Credenza>
  )
}
