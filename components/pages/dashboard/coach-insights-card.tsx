"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type CoachRangeType = "7d" | "30d" | "90d"

interface CoachInsightPayload {
  rangeType: CoachRangeType
  startDate: string
  endDate: string
  summary: string
  coachComment: string
  actionItems: string[]
  score: number
  generatedAt: string
}

const RANGES: { key: CoachRangeType; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
]

export function CoachInsightsCard({ initialInsight }: { initialInsight: CoachInsightPayload }) {
  const [range, setRange] = React.useState<CoachRangeType>(initialInsight.rangeType)
  const [insight, setInsight] = React.useState<CoachInsightPayload>(initialInsight)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function changeRange(nextRange: CoachRangeType) {
    if (nextRange === range) return
    setRange(nextRange)
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/coach/insights?range=${nextRange}`)
      if (!res.ok) {
        setError("Could not load insight.")
        return
      }
      setInsight((await res.json()) as CoachInsightPayload)
    } catch {
      setError("Could not load insight.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Coach Insights</CardTitle>
            <p className="text-xs text-muted-foreground">
              Personalized feedback from your food, hydration, workout, and fasting data.
            </p>
          </div>
          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Score {insight.score}/100
          </div>
        </div>
        <div className="flex w-fit gap-1 rounded-full bg-muted p-1">
          {RANGES.map((item) => (
            <button
              key={item.key}
              onClick={() => changeRange(item.key)}
              className={cn(
                "cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors",
                range === item.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <p className="text-xs text-muted-foreground">Refreshing insight...</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}

        <p className="text-sm text-foreground/90">{insight.summary}</p>
        <p className="text-sm italic text-muted-foreground">{insight.coachComment}</p>

        <div className="space-y-1.5 border-t pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next Actions</p>
          {insight.actionItems.map((item, index) => (
            <p key={`${index}-${item}`} className="text-sm text-foreground/90">
              {index + 1}. {item}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
