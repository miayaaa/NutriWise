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
        <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2">
          {estimate.comment}
        </p>
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

export function QuickFoodLog({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter()
  const [mealType, setMealType] = React.useState<MealType>("SNACK")
  const [description, setDescription] = React.useState("")
  const [estimate, setEstimate] = React.useState<CalorieEstimate | null>(null)
  const [isEstimating, setIsEstimating] = React.useState(false)
  const [isLogging, setIsLogging] = React.useState(false)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-select meal type by time of day on mount
  React.useEffect(() => {
    const h = new Date().getHours()
    if (h >= 5 && h < 11) setMealType("BREAKFAST")
    else if (h >= 11 && h < 15) setMealType("LUNCH")
    else if (h >= 17 && h < 21) setMealType("DINNER")
    else setMealType("SNACK")
  }, [])

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = description.trim()
    if (trimmed.length < 3) {
      setEstimate(null)
      setIsEstimating(false)
      return
    }

    setIsEstimating(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/ai/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ foodDescription: trimmed }),
        })
        if (res.ok) setEstimate((await res.json()) as CalorieEstimate)
        else setEstimate(null)
      } catch {
        setEstimate(null)
      } finally {
        setIsEstimating(false)
      }
    }, 800)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [description])

  async function handleLog() {
    const trimmed = description.trim()
    if (!trimmed) return

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
        }),
      })

      if (!res.ok) {
        toast({ title: "Something went wrong.", description: "Could not save your meal. Please try again.", variant: "destructive" })
        return
      }

      const result = await res.json()
      const kcal = result.aiCalories ?? estimate?.calories
      toast({
        description: kcal
          ? `Logged! ${Math.round(kcal).toLocaleString()} kcal recorded.`
          : "Meal logged successfully.",
      })

      setDescription("")
      setEstimate(null)
      router.refresh()
      onSuccess?.()
    } finally {
      setIsLogging(false)
    }
  }

  const canLog = description.trim().length >= 3 && !isLogging

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Meal type selector */}
      <div className="flex flex-wrap gap-2">
        {MEAL_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setMealType(opt.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              mealType === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <span>{opt.emoji}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Food input */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">What did you eat?</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">AI</span>
        </div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. a bowl of oatmeal with banana, one cup of coffee with milk"
          className="resize-none"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              if (canLog) handleLog()
            }
          }}
        />
      </div>

      {isEstimating && <CalorieSkeletonCard />}
      {!isEstimating && estimate && <CaloriePreviewCard estimate={estimate} />}

      <div className="flex justify-end">
        <Button onClick={handleLog} disabled={!canLog} size="sm">
          {isLogging ? (
            <><Icons.spinner className="mr-2 h-4 w-4 animate-spin" />Logging...</>
          ) : (
            <><Icons.add className="mr-2 h-4 w-4" />Log meal</>
          )}
        </Button>
      </div>
    </div>
  )
}
