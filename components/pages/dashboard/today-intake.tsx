"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK"

interface TodayMeal {
  id: string
  foodDescription: string | null
  aiCalories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  mealType: MealType
  date: string
}

interface DailyGoalCardProps {
  meals: TodayMeal[]
  dailyCalorieGoal?: number | null
  proteinTargetG?: number | null
  carbTargetG?: number | null
  fatTargetG?: number | null
  workoutCount?: number
  consecutiveTrainingDays?: number
}

const MEAL_META: Record<MealType, { label: string; emoji: string }> = {
  BREAKFAST: { label: "Breakfast", emoji: "🌅" },
  LUNCH:     { label: "Lunch",     emoji: "☀️" },
  DINNER:    { label: "Dinner",    emoji: "🌙" },
  SNACK:     { label: "Snack",     emoji: "🍎" },
}

const MEAL_ORDER: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"]

type GoalStatus = "ok" | "warn" | "danger" | "empty"

function statusIcon(s: GoalStatus) {
  return s === "ok" ? "✅" : s === "warn" ? "⚠️" : s === "danger" ? "🚨" : "—"
}

function statusColor(s: GoalStatus) {
  return s === "ok"
    ? "text-emerald-600 dark:text-emerald-400"
    : s === "warn"
    ? "text-amber-500"
    : s === "danger"
    ? "text-red-500"
    : "text-muted-foreground"
}

function RingProgress({ pct }: { pct: number }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const dash = Math.min(pct / 100, 1) * circ
  const color = pct >= 110 ? "#ef4444" : pct >= 85 ? "#10b981" : "#f59e0b"
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" strokeWidth="3" className="stroke-muted" />
      <circle
        cx="22" cy="22" r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform="rotate(-90 22 22)"
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
    </svg>
  )
}

function MacroRow({
  label, value, target, color,
}: {
  label: string
  value: number
  target: number | null | undefined
  color: string
}) {
  const pct = target ? Math.min((value / target) * 100, 100) : null
  const over = target ? value > target * 1.05 : false
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span>
          <span className={cn("font-semibold tabular-nums", color)}>{Math.round(value)}g</span>
          {target && (
            <span className="text-muted-foreground"> / {target}g</span>
          )}
          {over && <span className="ml-1 text-[10px] text-amber-500">over</span>}
        </span>
      </div>
      {pct !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", over ? "bg-amber-400" : color.replace("text-", "bg-"))}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

function MacroBar({
  protein, carbs, fat,
  proteinTarget, carbTarget, fatTarget,
}: {
  protein: number; carbs: number; fat: number
  proteinTarget?: number | null
  carbTarget?: number | null
  fatTarget?: number | null
}) {
  if (protein === 0 && carbs === 0 && fat === 0) return null
  const hasTargets = proteinTarget || carbTarget || fatTarget
  if (hasTargets) {
    return (
      <div className="space-y-2.5">
        <MacroRow label="Protein" value={protein} target={proteinTarget} color="text-blue-500" />
        <MacroRow label="Carbs"   value={carbs}   target={carbTarget}   color="text-amber-500" />
        <MacroRow label="Fat"     value={fat}      target={fatTarget}    color="text-rose-400" />
      </div>
    )
  }
  // Fallback: proportion bar when no targets are set
  const total = protein * 4 + carbs * 4 + fat * 9
  const pPct = Math.round((protein * 4 / total) * 100)
  const cPct = Math.round((carbs * 4 / total) * 100)
  const fPct = 100 - pPct - cPct
  return (
    <div className="space-y-1.5">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-blue-500" style={{ width: `${pPct}%` }} />
        <div className="bg-amber-400" style={{ width: `${cPct}%` }} />
        <div className="bg-rose-400" style={{ width: `${fPct}%` }} />
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span><span className="font-medium text-blue-500">{Math.round(protein)}g</span> Protein</span>
        <span><span className="font-medium text-amber-500">{Math.round(carbs)}g</span> Carbs</span>
        <span><span className="font-medium text-rose-400">{Math.round(fat)}g</span> Fat</span>
      </div>
    </div>
  )
}

export function DailyGoalCard({
  meals,
  dailyCalorieGoal,
  proteinTargetG,
  carbTargetG,
  fatTargetG,
  workoutCount = 0,
  consecutiveTrainingDays = 0,
}: DailyGoalCardProps) {
  const totalKcal    = meals.reduce((s, m) => s + (m.aiCalories ?? 0), 0)
  const totalProtein = meals.reduce((s, m) => s + (m.protein   ?? 0), 0)
  const totalCarbs   = meals.reduce((s, m) => s + (m.carbs     ?? 0), 0)
  const totalFat     = meals.reduce((s, m) => s + (m.fat       ?? 0), 0)

  const goal = dailyCalorieGoal ?? 0
  const goalPct = goal > 0 ? (totalKcal / goal) * 100 : 0

  // ── Calorie status ────────────────────────────────────────────────
  let kcalStatus: GoalStatus = "empty"
  if (totalKcal > 0) {
    if (totalKcal < 1000) kcalStatus = "danger"
    else if (goal > 0 && totalKcal / goal < 0.85) kcalStatus = "warn"
    else if (goal > 0 && totalKcal / goal <= 1.10) kcalStatus = "ok"
    else if (goal > 0) kcalStatus = "warn"
    else kcalStatus = "warn"
  }

  // ── Protein status ────────────────────────────────────────────────
  let proteinStatus: GoalStatus = "empty"
  let proteinLabel = ""
  if (proteinTargetG && totalProtein > 0) {
    const pct = totalProtein / proteinTargetG
    proteinStatus = pct >= 0.9 ? "ok" : pct >= 0.6 ? "warn" : "danger"
    proteinLabel = `Protein ${Math.round(totalProtein)}g`
  } else if (totalProtein > 0) {
    proteinStatus = "warn"
    proteinLabel = `Protein ${Math.round(totalProtein)}g`
  }

  // ── Workout status ────────────────────────────────────────────────
  const workoutStatus: GoalStatus = workoutCount > 0 ? "ok" : "empty"
  const showRestWarning = consecutiveTrainingDays >= 4

  // ── All-goals-met celebration ─────────────────────────────────────
  // Requires calorie goal to be set and hit; protein target hit if set
  const kcalGoalMet = kcalStatus === "ok"
  const proteinGoalMet = proteinTargetG ? proteinStatus === "ok" : true
  const allGoalsMet = kcalGoalMet && proteinGoalMet && goal > 0

  // Grouped meals
  const grouped = MEAL_ORDER.reduce<Record<MealType, TodayMeal[]>>(
    (acc, type) => { acc[type] = meals.filter((m) => m.mealType === type); return acc },
    { BREAKFAST: [], LUNCH: [], DINNER: [], SNACK: [] }
  )
  const hasMacros = totalProtein > 0 || totalCarbs > 0 || totalFat > 0

  return (
    <Card className={cn(
      totalKcal > 0 && totalKcal < 1000 && "ring-1 ring-red-400/50"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Today&apos;s Goals</CardTitle>
        {showRestWarning && (
          <span className="rounded-full bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-xs text-amber-500 font-medium">
            {consecutiveTrainingDays} days in a row — rest up
          </span>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── All-goals-met banner ── */}
        {allGoalsMet && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <span className="text-base">🎉</span>
            <span>Today&apos;s goals hit{workoutCount > 0 ? " — nutrition + workout!" : "!"}</span>
          </div>
        )}

        {/* ── Status strip ── */}
        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          {/* Calories pill */}
          <span className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 font-medium",
            kcalStatus === "ok"     && "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
            kcalStatus === "warn"   && "bg-amber-50 dark:bg-amber-950/40 text-amber-600",
            kcalStatus === "danger" && "bg-red-50 dark:bg-red-950/40 text-red-600",
            kcalStatus === "empty"  && "bg-muted text-muted-foreground",
          )}>
            <span>{statusIcon(kcalStatus)}</span>
            <span>{totalKcal > 0 ? `${Math.round(totalKcal)} kcal` : "No calories logged"}</span>
          </span>

          {/* Protein pill */}
          {(totalProtein > 0 || proteinTargetG) && (
            <span className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 font-medium",
              proteinStatus === "ok"     && "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
              proteinStatus === "warn"   && "bg-amber-50 dark:bg-amber-950/40 text-amber-600",
              proteinStatus === "danger" && "bg-red-50 dark:bg-red-950/40 text-red-600",
              proteinStatus === "empty"  && "bg-muted text-muted-foreground",
            )}>
              <span>{statusIcon(proteinStatus)}</span>
              <span>
                {proteinLabel || "Protein --"}
                {proteinTargetG && <span className="opacity-60"> / {proteinTargetG}g</span>}
              </span>
            </span>
          )}

          {/* Workout pill */}
          <span className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 font-medium",
            workoutStatus === "ok"    && "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
            workoutStatus === "empty" && "bg-muted text-muted-foreground",
          )}>
            <span>{statusIcon(workoutStatus)}</span>
            <span>{workoutCount > 0 ? `Workout ×${workoutCount}` : "No workout"}</span>
          </span>
        </div>

        {/* ── Calorie detail (only if goal is set) ── */}
        {goal > 0 && totalKcal > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className={cn("text-2xl font-bold tabular-nums leading-none", statusColor(kcalStatus))}>
                {Math.round(totalKcal).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">kcal consumed</div>
            </div>
            <div className="text-muted-foreground/30 text-lg font-light">/</div>
            <div className="flex-1 min-w-0 text-center">
              <div className="text-xs text-muted-foreground mb-0.5">Goal</div>
              <div className="text-lg font-bold tabular-nums text-amber-500 leading-none">
                {goal.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">kcal</div>
            </div>
            <div className="text-muted-foreground/30 text-lg font-light">/</div>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <RingProgress pct={goalPct} />
              <div className="min-w-0">
                <div className="text-lg font-bold tabular-nums leading-none">
                  {goalPct >= 110 ? "Over" : goalPct >= 100 ? "0" : Math.round(goal - totalKcal).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">remaining</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Macro bar ── */}
        {hasMacros && (
          <MacroBar
            protein={totalProtein} carbs={totalCarbs} fat={totalFat}
            proteinTarget={proteinTargetG} carbTarget={carbTargetG} fatTarget={fatTargetG}
          />
        )}

        {/* ── Meal list ── */}
        {meals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet. Tap Quick Log above to start.</p>
        ) : (
          <div className="space-y-3 pt-1 border-t border-border">
            {MEAL_ORDER.map((type) => {
              const group = grouped[type]
              if (group.length === 0) return null
              const meta = MEAL_META[type]
              const groupKcal = group.reduce((s, m) => s + (m.aiCalories ?? 0), 0)
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {meta.emoji} {meta.label}
                    </span>
                    {groupKcal > 0 && (
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">
                        {Math.round(groupKcal)} kcal
                      </span>
                    )}
                  </div>
                  {group.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-sm pl-1 gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="truncate block text-foreground/80">{m.foodDescription}</span>
                        <span className="text-[11px] text-muted-foreground/70 tabular-nums" suppressHydrationWarning>
                          {new Date(m.date).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {m.aiCalories != null && (
                        <span className="shrink-0 tabular-nums font-medium text-foreground/70">
                          {Math.round(m.aiCalories)} kcal
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {goal === 0 && (
          <p className="text-xs text-muted-foreground">
            Set a daily calorie goal in{" "}
            <a href="/dashboard/settings" className="underline underline-offset-2">Settings</a>
            {" "}to track your progress.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
