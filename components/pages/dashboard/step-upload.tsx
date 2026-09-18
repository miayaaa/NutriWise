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

const pad = (n: number) => String(n).padStart(2, "0")
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
  const [editValue, setEditValue] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

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

  async function handleSave() {
    const parsed = Number(editValue)
    if (!Number.isFinite(parsed) || parsed < 0) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/activities/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: todayLocalMidnightISO(), steps: Math.round(parsed) }),
      })
      if (!res.ok) {
        toast({ title: "Save failed", description: "Could not save your step count. Please try again.", variant: "destructive" })
        return
      }
      setSteps(Math.round(parsed))
      setPending(null)
      toast({ description: `${Math.round(parsed).toLocaleString("en-US")} steps logged for today.` })
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
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold leading-none">
              {steps != null ? steps.toLocaleString("en-US") : "—"}
            </p>
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
                : <>📷 Scan screenshot</>
            }
          </button>
        </div>

        {pending && (
          <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Detected</p>
              {conf && (
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", conf.className)}>
                  {conf.label} confidence
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={200000}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground tabular-nums"
              />
              <span className="text-xs text-muted-foreground shrink-0">steps</span>
            </div>

            {pending.comment && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2">{pending.comment}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" disabled={isSaving} onClick={() => setPending(null)}>
                Discard
              </Button>
              <Button type="button" size="sm" disabled={isSaving} onClick={handleSave}>
                {isSaving ? <><Icons.spinner className="mr-2 h-3.5 w-3.5 animate-spin" />Saving…</> : "Save"}
              </Button>
            </div>
          </div>
        )}

        {status === "failed" && !pending && (
          <p className="text-xs text-red-600 dark:text-red-400">Could not read step count from that image. Try a clearer screenshot.</p>
        )}
      </CardContent>
    </Card>
  )
}
