"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"

const schema = z.object({
  dailyCalorieGoal: z.number().int().min(500).max(10000),
  dailyWaterGoal: z.number().int().min(500).max(5000),
})
type FormData = z.infer<typeof schema>

const CALORIE_PRESETS = [
  { label: "Cut",         value: 1400 },
  { label: "Maintenance", value: 1800 },
  { label: "Bulk",        value: 2400 },
]
const WATER_PRESETS = [
  { label: "Light",    value: 1500 },
  { label: "Standard", value: 2000 },
  { label: "Active",   value: 2500 },
]

interface Props {
  user: {
    id: string
    dailyCalorieGoal?: number | null
    dailyWaterGoal: number
  }
}

export function UserDailyGoalsForm({ user }: Props) {
  const router = useRouter()
  const { handleSubmit, register, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        dailyCalorieGoal: user.dailyCalorieGoal ?? 2000,
        dailyWaterGoal: user.dailyWaterGoal,
      },
    })

  const kcal = watch("dailyCalorieGoal")
  const water = watch("dailyWaterGoal")

  async function onSubmit(data: FormData) {
    const [res1, res2] = await Promise.all([
      fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyCalorieGoal: data.dailyCalorieGoal }),
      }),
      fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyWaterGoal: data.dailyWaterGoal }),
      }),
    ])

    if (!res1.ok || !res2.ok) {
      return toast({ title: "Error", description: "Could not save goals.", variant: "destructive" })
    }
    toast({ description: "Daily goals saved." })
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Daily Goals</CardTitle>
          <CardDescription>Your calorie and hydration targets for the dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Calories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="dailyCalorieGoal">Calorie target</Label>
              <span className="text-sm font-semibold tabular-nums text-primary">{kcal} kcal</span>
            </div>
            <Input
              id="dailyCalorieGoal"
              type="number"
              min={500}
              max={10000}
              className="w-full"
              {...register("dailyCalorieGoal", { valueAsNumber: true })}
            />
            {errors.dailyCalorieGoal && (
              <p className="text-xs text-red-600">{errors.dailyCalorieGoal.message}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {CALORIE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setValue("dailyCalorieGoal", p.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors cursor-pointer",
                    kcal === p.value
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {p.label} · {p.value} kcal
                </button>
              ))}
            </div>
          </div>

          <div className="border-t" />

          {/* Water */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="dailyWaterGoal">Water target</Label>
              <span className="text-sm font-semibold tabular-nums text-blue-500">{water} ml</span>
            </div>
            <Input
              id="dailyWaterGoal"
              type="number"
              min={500}
              max={5000}
              className="w-full"
              {...register("dailyWaterGoal", { valueAsNumber: true })}
            />
            {errors.dailyWaterGoal && (
              <p className="text-xs text-red-600">{errors.dailyWaterGoal.message}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {WATER_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setValue("dailyWaterGoal", p.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors cursor-pointer",
                    water === p.value
                      ? "border-blue-500 bg-blue-50 text-blue-600 font-medium dark:bg-blue-950/30 dark:text-blue-400"
                      : "border-border text-muted-foreground hover:border-blue-300"
                  )}
                >
                  {p.label} · {p.value} ml
                </button>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <button type="submit" className={cn(buttonVariants())} disabled={isSubmitting}>
            {isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </button>
        </CardFooter>
      </Card>
    </form>
  )
}
