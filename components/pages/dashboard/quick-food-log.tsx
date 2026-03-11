"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"

type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK"

interface CalorieEstimate {
  calories: number
  protein: number
  carbs: number
  fat: number
  breakdown: Array<{ item: string; calories: number }>
  confidence: "high" | "medium" | "low"
  comment?: string
}

const MEAL_OPTIONS: { value: MealType; label: string; emoji: string }[] = [
  { value: "BREAKFAST", label: "Breakfast", emoji: "🌅" },
  { value: "LUNCH", label: "Lunch", emoji: "☀️" },
  { value: "DINNER", label: "Dinner", emoji: "🌙" },
  { value: "SNACK", label: "Snack", emoji: "🍎" },
]

const CONFIDENCE_CONFIG = {
  high: { label: "High", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  medium: { label: "Medium", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  low: { label: "Low", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

function MacroBar({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein * 4 + carbs * 4 + fat * 9
  if (total === 0) return null
  const pPct = Math.round((protein * 4 / total) * 100)
  const cPct = Math.round((carbs * 4 / total) * 100)
  const fPct = 100 - pPct - cPct
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-blue-500" style={{ width: `${pPct}%` }} />
        <div className="bg-amber-400" style={{ width: `${cPct}%` }} />
        <div className="bg-rose-400" style={{ width: `${fPct}%` }} />
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span><span className="font-medium text-blue-500">{protein}g</span> protein</span>
        <span><span className="font-medium text-amber-500">{carbs}g</span> carbs</span>
        <span><span className="font-medium text-rose-400">{fat}g</span> fat</span>
      </div>
    </div>
  )
}

function CaloriePreviewCard({ estimate }: { estimate: CalorieEstimate }) {
  const conf = CONFIDENCE_CONFIG[estimate.confidence]
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estimated</p>
          <p className="text-3xl font-bold text-foreground leading-none">
            {estimate.calories.toLocaleString()}
            <span className="ml-1 text-base font-normal text-muted-foreground">kcal</span>
          </p>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", conf.className)}>
          {conf.label}
        </span>
      </div>
      <MacroBar protein={estimate.protein} carbs={estimate.carbs} fat={estimate.fat} />
      {estimate.comment && (
        <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2">{estimate.comment}</p>
      )}
      {estimate.breakdown.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border">
          {estimate.breakdown.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-foreground/80 truncate max-w-[70%]">{item.item}</span>
              <span className="font-medium tabular-nums text-foreground/70 shrink-0">{item.calories} kcal</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CalorieSkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3 animate-pulse">
      <div className="flex items-end justify-between">
        <div className="space-y-1.5">
          <div className="h-3 w-20 rounded bg-muted-foreground/20" />
          <div className="h-8 w-32 rounded bg-muted-foreground/20" />
        </div>
        <div className="h-6 w-16 rounded-full bg-muted-foreground/20" />
      </div>
      <div className="h-2 w-full rounded-full bg-muted-foreground/20" />
      <div className="space-y-2 pt-1 border-t border-border">
        {[1, 2].map((i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 w-2/5 rounded bg-muted-foreground/20" />
            <div className="h-4 w-16 rounded bg-muted-foreground/20" />
          </div>
        ))}
      </div>
    </div>
  )
}

const pad = (n: number) => String(n).padStart(2, "0")
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function toTimeStr(d: Date) { return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
function formatLoggedAt(date: string, time: string): string {
  if (!date || !time) return "Now"
  const d = new Date(`${date}T${time}`)
  const now = new Date()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (d.toDateString() === now.toDateString()) return `Today, ${t}`
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${t}`
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + `, ${t}`
}

export type QuickFoodLogHandle = { triggerLog: () => Promise<boolean> }

interface QuickFoodLogProps {
  onSuccess?: () => void
  hideButton?: boolean
  onCanLogChange?: (canLog: boolean) => void
  onLoggingChange?: (isLogging: boolean) => void
}

export const QuickFoodLog = React.forwardRef<QuickFoodLogHandle, QuickFoodLogProps>(
  function QuickFoodLog({ onSuccess, hideButton = false, onCanLogChange, onLoggingChange }, ref) {
    const router = useRouter()
    const [mealType, setMealType] = React.useState<MealType>("SNACK")
    const [description, setDescription] = React.useState("")
    const [estimate, setEstimate] = React.useState<CalorieEstimate | null>(null)
    const [aiStatus, setAiStatus] = React.useState<"idle" | "fetching" | "done" | "failed">("idle")
    const [isLogging, setIsLogging] = React.useState(false)
    const [logDate, setLogDate] = React.useState("")
    const [logTime, setLogTime] = React.useState("")
    const [showTimePicker, setShowTimePicker] = React.useState(false)
    const estimateReqRef = React.useRef(0)
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    React.useEffect(() => {
      const now = new Date()
      setLogDate(toDateStr(now))
      setLogTime(toTimeStr(now))
    }, [])

    React.useEffect(() => {
      const h = new Date().getHours()
      if (h >= 5 && h < 11) setMealType("BREAKFAST")
      else if (h >= 11 && h < 15) setMealType("LUNCH")
      else if (h >= 17 && h < 21) setMealType("DINNER")
      else setMealType("SNACK")
    }, [])

    const runEstimate = React.useCallback(async (text: string) => {
      const reqId = ++estimateReqRef.current
      setAiStatus("fetching")
      try {
        const res = await fetch("/api/ai/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ foodDescription: text }),
        })
        if (reqId !== estimateReqRef.current) return
        if (res.ok) {
          setEstimate((await res.json()) as CalorieEstimate)
          setAiStatus("done")
        } else {
          setEstimate(null)
          setAiStatus("failed")
        }
      } catch {
        if (reqId !== estimateReqRef.current) return
        setEstimate(null)
        setAiStatus("failed")
      }
    }, [])

    // Auto-estimate: fires 1.5s after the user stops typing (≥5 chars)
    // The manual button can always override this immediately
    React.useEffect(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      const trimmed = description.trim()
      if (trimmed.length < 5) {
        if (trimmed.length === 0) { setEstimate(null); setAiStatus("idle") }
        return
      }
      // Only auto-trigger if there's no fresh estimate yet
      if (aiStatus === "done" || aiStatus === "fetching") return
      debounceRef.current = setTimeout(() => runEstimate(trimmed), 1500)
      return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [description, aiStatus, runEstimate])

    const canLog = description.trim().length >= 3 && !isLogging
    const canEstimate = description.trim().length >= 3 && aiStatus !== "fetching"

    React.useEffect(() => { onCanLogChange?.(canLog) }, [canLog, onCanLogChange])
    React.useEffect(() => { onLoggingChange?.(isLogging) }, [isLogging, onLoggingChange])

    async function handleLog(): Promise<boolean> {
      const trimmed = description.trim()
      if (!trimmed || trimmed.length < 3 || isLogging) return false
      setIsLogging(true)
      try {
        const res = await fetch("/api/food-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            foodDescription: trimmed,
            mealType,
            aiCalories: estimate?.calories,
            protein: estimate?.protein,
            carbs: estimate?.carbs,
            fat: estimate?.fat,
            aiComment: estimate?.comment,
            date: logDate && logTime ? new Date(`${logDate}T${logTime}`).toISOString() : new Date().toISOString(),
            localDate: logDate || toDateStr(new Date()),
          }),
        })
        if (!res.ok) {
          toast({ title: "Save failed", description: "Could not save your meal. Please try again.", variant: "destructive" })
          return false
        }
        const result = await res.json()
        const kcal = result.aiCalories ?? estimate?.calories
        toast({ description: kcal ? `Logged! ${Math.round(kcal).toLocaleString()} kcal recorded.` : "Meal logged." })
        setDescription("")
        setEstimate(null)
        setAiStatus("idle")
        const now = new Date()
        setLogDate(toDateStr(now))
        setLogTime(toTimeStr(now))
        setShowTimePicker(false)
        router.refresh()
        onSuccess?.()
        return true
      } catch {
        toast({ title: "Network error", description: "Check your connection and try again.", variant: "destructive" })
        return false
      } finally {
        setIsLogging(false)
      }
    }

    React.useImperativeHandle(ref, () => ({ triggerLog: handleLog }))

    return (
      <div className="space-y-4">
        {/* Meal type */}
        <div className="flex flex-wrap gap-2">
          {MEAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={isLogging}
              onClick={() => setMealType(opt.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                mealType === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <span>{opt.emoji}</span><span>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Time picker */}
        <div className="space-y-2">
          <button
            type="button"
            disabled={isLogging}
            onClick={() => setShowTimePicker((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Icons.calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{formatLoggedAt(logDate, logTime)}</span>
            <span className="text-muted-foreground/40">· tap to change</span>
          </button>

          {showTimePicker && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" disabled={isLogging}
                  onClick={() => { const now = new Date(); setLogDate(toDateStr(now)); setLogTime(toTimeStr(now)) }}>
                  Use now
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <input type="date" value={logDate} max={toDateStr(new Date())}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Time</p>
                  <input type="time" value={logTime}
                    onChange={(e) => setLogTime(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Food input + AI estimate button in one row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">What did you eat?</span>

            {/* AI estimate button — always visible when there's text */}
            <button
              type="button"
              disabled={!canEstimate || isLogging}
              onClick={() => runEstimate(description.trim())}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                aiStatus === "fetching"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 cursor-wait"
                  : aiStatus === "done"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200"
                    : aiStatus === "failed"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200"
                      : canEstimate
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
              )}
            >
              {aiStatus === "fetching"
                ? <><Icons.spinner className="h-3 w-3 animate-spin" />Estimating…</>
                : aiStatus === "done"
                  ? <><Icons.check className="h-3 w-3" />Re-estimate</>
                  : aiStatus === "failed"
                    ? <><Icons.close className="h-3 w-3" />Retry AI</>
                    : <>✨ Estimate</>
              }
            </button>
          </div>

          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. a bowl of oatmeal with banana, one cup of coffee with milk"
            className="resize-none"
            rows={3}
            disabled={isLogging}
            onKeyDown={(e) => {
              // Cmd/Ctrl+Enter → log
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                if (canLog) handleLog()
              }
              // Shift+Enter → estimate
              if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault()
                if (canEstimate) runEstimate(description.trim())
              }
            }}
          />

          {/* Status hint below textarea */}
          <p className="text-xs text-muted-foreground">
            {description.trim().length === 0
              ? "Describe your meal. AI estimation is optional — you can log without it."
              : description.trim().length < 3
                ? "Keep typing…"
                : aiStatus === "fetching"
                  ? "AI is estimating calories and macros…"
                  : aiStatus === "done"
                    ? "Estimate ready. Log or re-estimate anytime."
                    : aiStatus === "failed"
                      ? "AI estimate failed. You can still log — or retry."
                      : description.trim().length >= 5
                        ? "AI will estimate in a moment… or press ✨ Estimate now."
                        : "Press ✨ Estimate or Shift+Enter for AI calories. Log anytime with Cmd+Enter."}
          </p>
        </div>

        {aiStatus === "fetching" && <CalorieSkeletonCard />}
        {aiStatus === "done" && estimate && <CaloriePreviewCard estimate={estimate} />}

        {!hideButton && (
          <div className="flex justify-end">
            <Button onClick={handleLog} disabled={!canLog} size="sm">
              {isLogging
                ? <><Icons.spinner className="mr-2 h-4 w-4 animate-spin" />Logging…</>
                : <><Icons.add className="mr-2 h-4 w-4" />Log meal</>
              }
            </Button>
          </div>
        )}
      </div>
    )
  }
)
