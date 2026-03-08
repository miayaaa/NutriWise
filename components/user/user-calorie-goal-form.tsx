"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { cn } from "@/lib/utils"
import { userProfileSchema } from "@/lib/validations/user"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"

type FormData = z.infer<typeof userProfileSchema>

interface UserCalorieGoalFormProps {
  user: { id: string; dailyCalorieGoal?: number | null }
}

// BMR presets (rough estimates) shown as helper text
const PRESETS = [
  { label: "Light cut", value: 1400 },
  { label: "Maintenance", value: 1800 },
  { label: "Active gain", value: 2400 },
]

export function UserCalorieGoalForm({ user }: UserCalorieGoalFormProps) {
  const router = useRouter()
  const {
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      dailyCalorieGoal: user.dailyCalorieGoal ?? 2000,
    },
  })

  const current = watch("dailyCalorieGoal")

  async function onSubmit(data: FormData) {
    const response = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyCalorieGoal: data.dailyCalorieGoal }),
    })
    if (!response?.ok) {
      return toast({
        title: "Something went wrong.",
        description: "Could not save your calorie goal. Please try again.",
        variant: "destructive",
      })
    }
    toast({ description: "Daily calorie goal saved." })
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Daily Calorie Goal</CardTitle>
          <CardDescription>
            Set your target daily intake. Used to track progress on the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1">
            <Label htmlFor="dailyCalorieGoal">Target (kcal / day)</Label>
            <Input
              id="dailyCalorieGoal"
              type="number"
              min={500}
              max={10000}
              className="w-full lg:w-[200px]"
              {...register("dailyCalorieGoal", { valueAsNumber: true })}
            />
            {errors?.dailyCalorieGoal && (
              <p className="px-1 text-xs text-red-600">
                {errors.dailyCalorieGoal.message}
              </p>
            )}
          </div>
          {/* Quick presets */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setValue("dailyCalorieGoal", p.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  current === p.value
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {p.label} · {p.value} kcal
              </button>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <button
            type="submit"
            className={cn(buttonVariants())}
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save
          </button>
        </CardFooter>
      </Card>
    </form>
  )
}
