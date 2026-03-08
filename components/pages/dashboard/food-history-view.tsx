import type { getFoodHistory } from "@/lib/api/history"

type HistoryData = Awaited<ReturnType<typeof getFoodHistory>>

const MEAL_META: Record<string, { label: string; emoji: string }> = {
  BREAKFAST: { label: "Breakfast", emoji: "🌅" },
  LUNCH:     { label: "Lunch",     emoji: "☀️" },
  DINNER:    { label: "Dinner",    emoji: "🌙" },
  SNACK:     { label: "Snack",     emoji: "🍎" },
}

function MacroChips({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  if (protein + carbs + fat === 0) return null
  return (
    <div className="flex gap-3 text-xs text-muted-foreground">
      <span><span className="font-medium text-blue-500">{Math.round(protein)}g</span> protein</span>
      <span><span className="font-medium text-amber-500">{Math.round(carbs)}g</span> carbs</span>
      <span><span className="font-medium text-rose-400">{Math.round(fat)}g</span> fat</span>
    </div>
  )
}

export function FoodHistoryView({ history }: { history: HistoryData }) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <p className="text-muted-foreground">No meals logged yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">Start logging from the Quick Log above.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {history.map(({ date, meals, totalCalories, totalProtein, totalCarbs, totalFat }) => {
        const dateLabel = new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        }).format(new Date(date + "T12:00:00"))

        const grouped = meals.reduce<Record<string, typeof meals>>((acc, m) => {
          const t = m.mealType as string
          if (!acc[t]) acc[t] = []
          acc[t].push(m)
          return acc
        }, {})

        return (
          <div key={date} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{dateLabel}</p>
                <MacroChips protein={totalProtein} carbs={totalCarbs} fat={totalFat} />
              </div>
              <div className="ml-4 shrink-0 text-right">
                <p className="text-2xl font-bold tabular-nums leading-none">
                  {Math.round(totalCalories).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">kcal</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-3">
              {["BREAKFAST", "LUNCH", "DINNER", "SNACK"].map((type) => {
                const group = grouped[type]
                if (!group?.length) return null
                const meta = MEAL_META[type]
                return (
                  <div key={type} className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {meta.emoji} {meta.label}
                    </p>
                    {group.map((m) => (
                      <div key={m.id} className="flex items-center justify-between pl-1 text-sm">
                        <span className="max-w-[70%] truncate text-foreground/80">
                          {m.foodDescription}
                        </span>
                        {m.aiCalories != null && (
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {Math.round(m.aiCalories).toLocaleString()} kcal
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
