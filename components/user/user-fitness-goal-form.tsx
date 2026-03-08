"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { FITNESS_GOALS, type FitnessGoal } from "@/lib/validations/user"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"

const GOAL_OPTIONS: { value: FitnessGoal; label: string; desc: string }[] = [
  { value: "fat_loss",           label: "Fat Loss",            desc: "Reduce body fat, prioritize calorie deficit + cardio" },
  { value: "muscle_gain",        label: "Muscle Gain",         desc: "Build muscle mass, progressive overload + surplus" },
  { value: "body_recomposition", label: "Body Recomposition",  desc: "Lose fat and gain muscle simultaneously" },
  { value: "maintenance",        label: "Maintenance",         desc: "Sustain current body composition and fitness" },
]

interface UserFitnessGoalFormProps {
  user: {
    id: string
    fitnessGoal?: FitnessGoal | null
  }
}

export function UserFitnessGoalForm({ user }: UserFitnessGoalFormProps) {
  const router = useRouter()
  const [selected, setSelected] = React.useState<FitnessGoal | null>(user.fitnessGoal ?? null)
  const [isSaving, setIsSaving] = React.useState(false)

  async function handleSave() {
    setIsSaving(true)
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fitnessGoal: selected }),
    })

    setIsSaving(false)

    if (!res.ok) {
      return toast({ title: "Error", description: "Could not save fitness goal.", variant: "destructive" })
    }

    toast({ description: "Fitness goal saved. Coach insights will update on next refresh." })
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fitness Goal</CardTitle>
        <CardDescription>
          Your goal shapes how the AI coach analyses your workouts and nutrition.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {GOAL_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSelected(opt.value)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors duration-150 cursor-pointer",
              selected === opt.value
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-muted-foreground/40"
            )}
          >
            <span className="font-medium text-sm">{opt.label}</span>
            <span className="text-xs text-muted-foreground leading-snug">{opt.desc}</span>
          </button>
        ))}
      </CardContent>
      <CardFooter>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={cn(buttonVariants())}
        >
          {isSaving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </button>
      </CardFooter>
    </Card>
  )
}
