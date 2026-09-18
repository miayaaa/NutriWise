"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { BsPersonWalking } from "react-icons/bs"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"

interface StepsEstimate {
  steps: number
  confidence: "high" | "medium" | "low"
  comment?: string
}

const CONFIDENCE_CONFIG = {
  high: { label: "High", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  medium: { label: "Medium", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  low: { label: "Low", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

function todayLocalMidnightISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

interface StepUploadProps {
  initialSteps: number | null
}

export function StepUpload({ initialSteps }: StepUploadProps) {
  const router = useRouter()
  const [steps, setSteps] = React.useState<number | null>(initialSteps)
  const [status, setStatus] = React.useState<"idle" | "scanning" | "failed">("idle")
  const [pending, setPending] = React.useState<StepsEstimate | null>(null)
  const [editValue, setEditValue] = React.useState(initialSteps != null ? String(initialSteps) : "")
  const [isSaving, setIsSaving] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const savedValueStr = steps != null ? String(steps) : ""
  const isDirty = editValue.trim() !== "" && editValue !== savedValueStr
  const parsedValue = Number(editValue)
  const canSave = isDirty && Number.isFinite(parsedValue) && parsedValue >= 0 && !isSaving

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    setStatus("scanning")
    setPending(null)
    try {
      const form = new FormData()
      form.append("image", file)
      const res = await fetch("/api/ai/vision-steps", { method: "POST", body: form })
      if (!res.ok) {
        setStatus("failed")
        const message = await res.text().catch(() => "")
        toast({ title: "Scan failed", description: message || "Could not process that image.", variant: "destructive" })
        return
      }
      const data = (await res.json()) as StepsEstimate
      setPending(data)
      setEditValue(String(data.steps))
      setStatus("idle")
    } catch {
      setStatus("failed")
    }
  }

  function handleDiscard() {
    setPending(null)
    setEditValue(savedValueStr)
  }

  async function handleSave() {
    if (!canSave) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/activities/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: todayLocalMidnightISO(), steps: Math.round(parsedValue) }),
      })
      if (!res.ok) {
        toast({ title: "Save failed", description: "Could not save your step count. Please try again.", variant: "destructive" })
        return
      }
      const rounded = Math.round(parsedValue)
      setSteps(rounded)
      setEditValue(String(rounded))
      setPending(null)
      toast({ description: `${rounded.toLocaleString("en-US")} steps logged for today.` })
      router.refresh()
    } catch {
      toast({ title: "Network error", description: "Check your connection and try again.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const conf = pending ? CONFIDENCE_CONFIG[pending.confidence] : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-medium">Steps</CardTitle>
          <BsPersonWalking className="h-4 w-4 text-sky-500" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={200000}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleSave() }}
                placeholder="0"
                className="w-24 border-b border-transparent bg-transparent text-3xl font-bold leading-none tabular-nums outline-none transition-colors focus:border-input"
              />
              <span className="text-sm text-muted-foreground">steps</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {steps != null ? "logged today" : "No steps logged today yet"}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
          <button
            type="button"
            disabled={status === "scanning"}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              status === "scanning"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 cursor-wait"
                : status === "failed"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {status === "scanning"
              ? <><Icons.spinner className="h-3 w-3 animate-spin" />Scanning…</>
              : status === "failed"
                ? <>Retry 📷</>
                : <>📷 Scan</>
            }
          </button>
        </div>

        {pending && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Detected from screenshot{pending.comment ? ` — ${pending.comment}` : ""}
            </p>
            {conf && (
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", conf.className)}>
                {conf.label}
              </span>
            )}
          </div>
        )}

        {isDirty && (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={isSaving} onClick={handleDiscard}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={!canSave} onClick={handleSave}>
              {isSaving ? <><Icons.spinner className="mr-2 h-3.5 w-3.5 animate-spin" />Saving…</> : "Save"}
            </Button>
          </div>
        )}

        {status === "failed" && !pending && (
          <p className="text-xs text-red-600 dark:text-red-400">Could not read step count from that image. Try a clearer screenshot.</p>
        )}
      </CardContent>
    </Card>
  )
}
