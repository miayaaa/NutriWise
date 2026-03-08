"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/icons"

type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK"

interface TodayMeal {
  id: string
  foodDescription: string | null
  aiCalories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  mealType: MealType
}

interface TodayIntakeProps {
  meals: TodayMeal[]
  dailyCalorieGoal?: number | null
}

const MEAL_META: Record<MealType, { label: string; emoji: string }> = {
  BREAKFAST: { label: "Breakfast", emoji: "🌅" },
  LUNCH:     { label: "Lunch",     emoji: "☀️" },
  DINNER:    { label: "Dinner",    emoji: "🌙" },
  SNACK:     { label: "Snack",     emoji: "🍎" },
}

const MEAL_ORDER: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"]

function MacroBar({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein * 4 + carbs * 4 + fat * 9
  if (total === 0) return null
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
        <span><span className="font-medium text-blue-500">{Math.round(protein)}g</span> protein</span>
        <span><span className="font-medium text-amber-500">{Math.round(carbs)}g</span> carbs</span>
        <span><span className="font-medium text-rose-400">{Math.round(fat)}g</span> fat</span>
      </div>
    </div>
  )
}

export function TodayIntake({ meals, dailyCalorieGoal }: TodayIntakeProps) {
  const totalKcal = meals.reduce((s, m) => s + (m.aiCalories ?? 0), 0)
  const totalProtein = meals.reduce((s, m) => s + (m.protein ?? 0), 0)
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs ?? 0), 0)
  const totalFat = meals.reduce((s, m) => s + (m.fat ?? 0), 0)

  const goal = dailyCalorieGoal ?? 0
  const pct = goal > 0 ? Math.min((totalKcal / goal) * 100, 100) : 0

  const barColor =
    goal === 0 ? "bg-primary"
    : pct >= 100 ? "bg-red-500"
    : pct >= 80  ? "bg-amber-500"
    : "bg-emerald-500"

  // Group meals by type, only include types that have entries
  const grouped = MEAL_ORDER.reduce<Record<MealType, TodayMeal[]>>(
    (acc, type) => {
      acc[type] = meals.filter((m) => m.mealType === type)
      return acc
    },
    { BREAKFAST: [], LUNCH: [], DINNER: [], SNACK: [] }
  )

  const hasMacros = totalProtein > 0 || totalCarbs > 0 || totalFat > 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Today&apos;s Intake</CardTitle>
        <Icons.activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calorie total */}
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold tabular-nums">
            {Math.round(totalKcal).toLocaleString()}
          </span>
          <span className="mb-1 text-sm text-muted-foreground">
            kcal{goal > 0 && <> / {goal.toLocaleString()} goal</>}
          </span>
        </div>

        {/* Progress bar */}
        {goal > 0 && (
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {pct >= 100
                ? "Daily goal reached"
                : `${Math.round(goal - totalKcal).toLocaleString()} kcal remaining`}
            </p>
          </div>
        )}

        {/* Macro bar */}
        {hasMacros && (
          <MacroBar protein={totalProtein} carbs={totalCarbs} fat={totalFat} />
        )}

        {/* Meals grouped by type */}
        {meals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No meals logged today. Add one to get started!
          </p>
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
                    <div key={m.id} className="flex items-center justify-between text-sm pl-1">
                      <span className="truncate max-w-[70%] text-foreground/80">
                        {m.foodDescription}
                      </span>
                      {m.aiCalories != null && (
                        <span className="shrink-0 tabular-nums font-medium text-foreground/70">
                          {Math.round(m.aiCalories).toLocaleString()} kcal
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
            <a href="/dashboard/settings" className="underline underline-offset-2">Settings</a>{" "}
            to track progress.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
