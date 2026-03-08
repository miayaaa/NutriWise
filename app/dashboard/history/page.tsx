import { Metadata } from "next"
import { redirect } from "next/navigation"

import { getFoodHistory } from "@/lib/api/history"
import { authOptions } from "@/lib/auth"
import { getCurrentUser } from "@/lib/session"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"

export const metadata: Metadata = {
  title: "History",
  description: "Your food log history.",
}

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

export default async function HistoryPage() {
  const user = await getCurrentUser()
  if (!user) redirect(authOptions?.pages?.signIn || "/signin")

  const history = await getFoodHistory(user.id)

  return (
    <Shell>
      <DashboardHeader heading="History" text="Your food logs for the past 30 days." />

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">No meals logged yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start logging from the{" "}
            <a href="/dashboard" className="underline underline-offset-2">Dashboard</a>.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map(({ date, meals, totalCalories, totalProtein, totalCarbs, totalFat }) => {
            const dateLabel = new Intl.DateTimeFormat("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            }).format(new Date(date + "T12:00:00"))

            // Group meals by type
            const grouped = meals.reduce<Record<string, typeof meals>>(
              (acc, m) => {
                const t = m.mealType as string
                if (!acc[t]) acc[t] = []
                acc[t].push(m)
                return acc
              },
              {}
            )

            return (
              <div key={date} className="rounded-xl border border-border bg-card p-5 space-y-4">
                {/* Day header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{dateLabel}</p>
                    <MacroChips protein={totalProtein} carbs={totalCarbs} fat={totalFat} />
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-2xl font-bold tabular-nums leading-none">
                      {Math.round(totalCalories).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">kcal</p>
                  </div>
                </div>

                {/* Meals grouped by type */}
                <div className="space-y-3 border-t border-border pt-3">
                  {["BREAKFAST", "LUNCH", "DINNER", "SNACK"].map((type) => {
                    const group = grouped[type]
                    if (!group?.length) return null
                    const meta = MEAL_META[type]
                    return (
                      <div key={type} className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {meta.emoji} {meta.label}
                        </p>
                        {group.map((m) => (
                          <div key={m.id} className="flex items-center justify-between text-sm pl-1">
                            <span className="truncate max-w-[70%] text-foreground/80">
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
      )}
    </Shell>
  )
}
