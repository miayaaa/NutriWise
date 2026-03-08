"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
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

interface UserFastingFormProps {
  user: {
    id: string
    fastingEnabled: boolean
    fastingStart: number
    fastingEnd: number
  }
}

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const ampm = i < 12 ? "AM" : "PM"
  const h = i === 0 ? 12 : i > 12 ? i - 12 : i
  return { value: i, label: `${h}:00 ${ampm}` }
})

const PRESETS = [
  { label: "12 PM – 8 PM（推荐）", start: 12, end: 20 },
  { label: "11 AM – 7 PM", start: 11, end: 19 },
  { label: "10 AM – 6 PM", start: 10, end: 18 },
  { label: "1 PM – 9 PM", start: 13, end: 21 },
]

export function UserFastingForm({ user }: UserFastingFormProps) {
  const router = useRouter()
  const [enabled, setEnabled] = React.useState(user.fastingEnabled)
  const [start, setStart] = React.useState(user.fastingStart)
  const [end, setEnd] = React.useState(user.fastingEnd)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const windowHours = end > start ? end - start : 24 - start + end

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fastingEnabled: enabled, fastingStart: start, fastingEnd: end }),
    })
    setIsSubmitting(false)
    if (!res.ok) {
      return toast({ title: "Something went wrong.", description: "Could not save fasting settings.", variant: "destructive" })
    }
    toast({ description: "Fasting window saved." })
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Intermittent Fasting (16:8)</CardTitle>
              <CardDescription className="mt-1">
                Track whether your meals fall within your eating window.
              </CardDescription>
            </div>
            {/* Toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled((v) => !v)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none",
                enabled ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                  enabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </CardHeader>

        {enabled && (
          <CardContent className="space-y-5">
            {/* Window summary */}
            <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-sm">
              <span className="font-medium text-primary">
                {HOURS[start].label} – {HOURS[end].label}
              </span>
              <span className="text-muted-foreground ml-2">
                · {windowHours}h eating window, {24 - windowHours}h fast
              </span>
            </div>

            {/* Preset buttons */}
            <div>
              <p className="text-sm font-medium mb-2">Quick presets</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => { setStart(p.start); setEnd(p.end) }}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      start === p.start && end === p.end
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual selectors */}
            <div className="flex gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Eating starts</p>
                <select
                  value={start}
                  onChange={(e) => setStart(Number(e.target.value))}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  {HOURS.map((h) => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Eating ends</p>
                <select
                  value={end}
                  onChange={(e) => setEnd(Number(e.target.value))}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  {HOURS.map((h) => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        )}

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
