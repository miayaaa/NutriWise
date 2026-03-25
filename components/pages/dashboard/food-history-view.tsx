"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { getFoodHistory } from "@/lib/api/history"
import { Icons } from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type HistoryData = Awaited<ReturnType<typeof getFoodHistory>>
type Meal = HistoryData[number]["meals"][number]

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

function LocalTime({ dateIso }: { dateIso: string }) {
  const t = new Date(dateIso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  return <span className="shrink-0 text-xs text-muted-foreground/60 tabular-nums" suppressHydrationWarning>{t}</span>
}

function getDateLabel(date: string) {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`
  const base = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(date + "T12:00:00"))
  if (date === todayStr) return `Today · ${base}`
  if (date === yesterdayStr) return `Yesterday · ${base}`
  return base
}

// ── Edit dialog ──────────────────────────────────────────────────────────────

function EditMealDialog({
  meal,
  open,
  onClose,
  onSaved,
}: {
  meal: Meal
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [description, setDescription] = React.useState(meal.foodDescription)
  const [calories, setCalories] = React.useState(meal.aiCalories != null ? String(Math.round(meal.aiCalories)) : "")
  const [mealType, setMealType] = React.useState(meal.mealType as string)
  const [saving, setSaving] = React.useState(false)

  // Reset when meal changes
  React.useEffect(() => {
    setDescription(meal.foodDescription)
    setCalories(meal.aiCalories != null ? String(Math.round(meal.aiCalories)) : "")
    setMealType(meal.mealType as string)
  }, [meal])

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/food-logs/${meal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodDescription: description.trim(),
          aiCalories: calories !== "" ? Number(calories) : undefined,
          mealType,
        }),
      })
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit meal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">Description</Label>
            <Input
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you eat?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-kcal">Calories (kcal)</Label>
              <Input
                id="edit-kcal"
                type="number"
                min={0}
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="e.g. 450"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-mealtype">Meal type</Label>
              <select
                id="edit-mealtype"
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {Object.entries(MEAL_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.emoji} {meta.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !description.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Delete confirm dialog ────────────────────────────────────────────────────

function DeleteConfirmDialog({
  meal,
  open,
  onClose,
  onDeleted,
}: {
  meal: Meal | null
  open: boolean
  onClose: () => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = React.useState(false)

  async function handleDelete() {
    if (!meal) return
    setDeleting(true)
    try {
      await fetch(`/api/food-logs/${meal.id}`, { method: "DELETE" })
      onDeleted()
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete meal?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          &ldquo;{meal?.foodDescription}&rdquo; will be permanently removed.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function FoodHistoryView({ history }: { history: HistoryData }) {
  const router = useRouter()
  const [editMeal, setEditMeal] = React.useState<Meal | null>(null)
  const [deleteMeal, setDeleteMeal] = React.useState<Meal | null>(null)

  function refresh() {
    router.refresh()
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <p className="text-muted-foreground">No meals logged yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">Start logging from the Quick Log above.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {history.map(({ date, meals, totalCalories, totalProtein, totalCarbs, totalFat }) => {
          const dateLabel = getDateLabel(date)

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
                    {Math.round(totalCalories).toLocaleString("en-US")}
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
                      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {meta.emoji} {meta.label}
                      </p>
                      {group.map((m) => (
                        <div key={m.id} className="group flex items-center gap-2 pl-1 text-sm">
                          <span className="min-w-0 flex-1 truncate text-foreground/80">
                            {m.foodDescription}
                          </span>
                          <div className="flex shrink-0 items-center gap-1">
                            <LocalTime dateIso={m.dateIso} />
                            {m.aiCalories != null && (
                              <span className="tabular-nums text-muted-foreground">
                                {Math.round(m.aiCalories).toLocaleString("en-US")} kcal
                              </span>
                            )}
                            {/* Action buttons — always visible on mobile, hover on desktop */}
                            <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditMeal(m)}
                                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label="Edit meal"
                              >
                                <Icons.edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteMeal(m)}
                                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                aria-label="Delete meal"
                              >
                                <Icons.trash className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
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

      {editMeal && (
        <EditMealDialog
          meal={editMeal}
          open={true}
          onClose={() => setEditMeal(null)}
          onSaved={refresh}
        />
      )}

      <DeleteConfirmDialog
        meal={deleteMeal}
        open={deleteMeal !== null}
        onClose={() => setDeleteMeal(null)}
        onDeleted={refresh}
      />
    </>
  )
}
