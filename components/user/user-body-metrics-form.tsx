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
  }
}

export function UserBodyMetricsForm({ user }: UserBodyMetricsFormProps) {
  const router = useRouter()
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(userBodyMetricsSchema),
    defaultValues: {
      heightCm: user.heightCm ?? null,
      weightGoalKg: user.weightGoalKg ?? null,
    },
  })

  async function onSubmit(data: FormData) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        heightCm: data.heightCm ?? null,
        weightGoalKg: data.weightGoalKg ?? null,
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
            Optional profile metrics used to personalize coaching insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="heightCm">Height (cm)</Label>
            <Input
              id="heightCm"
              type="number"
              min={80}
              max={260}
              placeholder="e.g. 170"
              {...register("heightCm", {
                setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
              })}
            />
            {errors.heightCm && (
              <p className="px-1 text-xs text-red-600">{errors.heightCm.message}</p>
            )}
          </div>
          <div className="grid gap-1">
            <Label htmlFor="weightGoalKg">Weight Goal (kg)</Label>
            <Input
              id="weightGoalKg"
              type="number"
              min={25}
              max={350}
              step="0.1"
              placeholder="e.g. 62.5"
              {...register("weightGoalKg", {
                setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
              })}
            />
            {errors.weightGoalKg && (
              <p className="px-1 text-xs text-red-600">{errors.weightGoalKg.message}</p>
            )}
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
