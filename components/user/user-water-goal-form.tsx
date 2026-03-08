"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { cn } from "@/lib/utils"
import { userWaterGoalSchema } from "@/lib/validations/user"
import { buttonVariants } from "@/components/ui/button"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"

type FormData = z.infer<typeof userWaterGoalSchema>

const PRESETS = [
  { label: "Light activity", value: 1500 },
  { label: "Standard", value: 2000 },
  { label: "High activity", value: 2500 },
]

export function UserWaterGoalForm({ user }: { user: { id: string; dailyWaterGoal: number } }) {
  const router = useRouter()
  const { handleSubmit, register, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(userWaterGoalSchema),
      defaultValues: { dailyWaterGoal: user.dailyWaterGoal },
    })

  const current = watch("dailyWaterGoal")

  async function onSubmit(data: FormData) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyWaterGoal: data.dailyWaterGoal }),
    })
    if (!res.ok) {
      return toast({ title: "Error", description: "Could not save.", variant: "destructive" })
    }
    toast({ description: "Daily water goal saved." })
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Daily Water Goal</CardTitle>
          <CardDescription>Set your target daily water intake.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1">
            <Label htmlFor="dailyWaterGoal">Target (ml / day)</Label>
            <Input
              id="dailyWaterGoal"
              type="number"
              min={500}
              max={5000}
              className="w-full lg:w-[200px]"
              {...register("dailyWaterGoal", { valueAsNumber: true })}
            />
            {errors.dailyWaterGoal && (
              <p className="px-1 text-xs text-red-600">{errors.dailyWaterGoal.message}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setValue("dailyWaterGoal", p.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  current === p.value
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {p.label} · {p.value} ml
              </button>
            ))}
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
