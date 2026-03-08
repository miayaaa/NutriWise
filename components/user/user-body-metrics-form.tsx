"use client"

import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { cn } from "@/lib/utils"
import { userBodyMetricsSchema } from "@/lib/validations/user"
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

type FormData = z.infer<typeof userBodyMetricsSchema>

interface UserBodyMetricsFormProps {
  user: {
    id: string
    heightCm?: number | null
    weightGoalKg?: number | null
    age?: number | null
    gender?: string | null
  }
}

const GENDER_OPTIONS = [
  { value: "male",   label: "Male" },
  { value: "female", label: "Female" },
  { value: "other",  label: "Other" },
]

export function UserBodyMetricsForm({ user }: UserBodyMetricsFormProps) {
  const router = useRouter()
  const {
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(userBodyMetricsSchema),
    defaultValues: {
      heightCm: user.heightCm ?? null,
      weightGoalKg: user.weightGoalKg ?? null,
      age: user.age ?? null,
      gender: (user.gender as "male" | "female" | "other" | null) ?? null,
    },
  })

  const selectedGender = watch("gender")

  async function onSubmit(data: FormData) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        heightCm: data.heightCm ?? null,
        weightGoalKg: data.weightGoalKg ?? null,
        age: data.age ?? null,
        gender: data.gender ?? null,
      }),
    })

    if (!res.ok) {
      return toast({
        title: "Error",
        description: "Could not save body metrics.",
        variant: "destructive",
      })
    }

    toast({ description: "Body metrics saved." })
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Body Metrics</CardTitle>
          <CardDescription>
            Used for BMR calculation and personalized AI coaching. All fields are optional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Age */}
            <div className="grid gap-1.5">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                min={10}
                max={120}
                placeholder="e.g. 28"
                {...register("age", {
                  setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                })}
              />
              {errors.age && (
                <p className="text-xs text-red-600">{errors.age.message}</p>
              )}
            </div>

            {/* Height */}
            <div className="grid gap-1.5">
              <Label htmlFor="heightCm">Height (cm)</Label>
              <Input
                id="heightCm"
                type="number"
                min={80}
                max={260}
                placeholder="e.g. 175"
                {...register("heightCm", {
                  setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                })}
              />
              {errors.heightCm && (
                <p className="text-xs text-red-600">{errors.heightCm.message}</p>
              )}
            </div>

            {/* Weight Goal */}
            <div className="grid gap-1.5">
              <Label htmlFor="weightGoalKg">Target Weight (kg)</Label>
              <Input
                id="weightGoalKg"
                type="number"
                min={25}
                max={350}
                step="0.1"
                placeholder="e.g. 70.0"
                {...register("weightGoalKg", {
                  setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                })}
              />
              {errors.weightGoalKg && (
                <p className="text-xs text-red-600">{errors.weightGoalKg.message}</p>
              )}
            </div>
          </div>

          {/* Gender */}
          <div className="grid gap-1.5">
            <Label>Biological Sex <span className="text-muted-foreground font-normal">(for BMR)</span></Label>
            <div className="flex gap-2">
              {GENDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue("gender", opt.value as "male" | "female" | "other")}
                  className={cn(
                    "flex-1 rounded-lg border py-2 text-sm font-medium transition-colors cursor-pointer",
                    selectedGender === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-muted-foreground/40"
                  )}
                >
                  {opt.label}
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
