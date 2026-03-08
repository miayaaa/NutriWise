import Anthropic from "@anthropic-ai/sdk"

export interface CoachInsightMetrics {
  rangeType: "7d" | "30d" | "90d"
  period: { startDate: string; endDate: string; days: number }
  nutrition: {
    mealCount: number
    totalCalories: number
    avgCaloriesPerMeal: number
    avgProtein: number
    avgCarbs: number
    avgFat: number
  }
  hydration: {
    totalWaterMl: number
    avgWaterMlPerDay: number
    dailyGoalMl: number
  }
  workout: {
    sessionCount: number
    totalDurationMin: number
    avgDurationMin: number
  }
  fasting: {
    enabled: boolean
    startHour: number
    endHour: number
  }
}

export interface CoachInsightResult {
  summary: string
  coachComment: string
  actionItems: string[]
  score: number
}

function fallbackCoachInsight(metrics: CoachInsightMetrics): CoachInsightResult {
  const hydrationPct = metrics.hydration.dailyGoalMl > 0
    ? Math.min((metrics.hydration.avgWaterMlPerDay / metrics.hydration.dailyGoalMl) * 100, 100)
    : 0
  const workoutDaysScore = Math.min(metrics.workout.sessionCount * 10, 40)
  const hydrationScore = Math.round(hydrationPct * 0.3)
  const nutritionScore = metrics.nutrition.mealCount > 0 ? 30 : 10
  const score = Math.max(20, Math.min(100, workoutDaysScore + hydrationScore + nutritionScore))

  const actionItems = [
    `Keep hydration above ${Math.round(metrics.hydration.dailyGoalMl * 0.9)} ml/day for the next week.`,
    metrics.workout.sessionCount >= 3
      ? "Maintain workout consistency and add 5-10% progressive overload on one session."
      : "Add at least 3 workout sessions next period, even if they are short.",
    "Aim for protein in each meal to support recovery and satiety.",
  ]

  return {
    summary: `You logged ${metrics.nutrition.mealCount} meals, ${metrics.workout.sessionCount} workouts, and averaged ${Math.round(metrics.hydration.avgWaterMlPerDay)} ml water/day over ${metrics.period.days} days.`,
    coachComment: "Good momentum overall. Keep the basics consistent and make one small measurable improvement this week.",
    actionItems,
    score,
  }
}

export async function generateCoachInsight(
  metrics: CoachInsightMetrics
): Promise<CoachInsightResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return fallbackCoachInsight(metrics)

  const client = new Anthropic({ apiKey })

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 260,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: `You are a professional but warm fitness coach.
Analyze this user health dataset and return JSON only:
${JSON.stringify(metrics)}

Return exactly this shape:
{"summary":"<1 concise sentence>","coachComment":"<1 concise sentence with encouragement + key observation>","actionItems":["<specific action 1>","<specific action 2>","<specific action 3>"],"score":<int 0-100>}

Rules:
- English only
- Keep output practical and non-judgmental
- Action items must be specific and measurable
- Do not include markdown or extra keys`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== "text") return fallbackCoachInsight(metrics)

    const raw = content.text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")

    const parsed = JSON.parse(raw) as Partial<CoachInsightResult>

    if (
      !parsed.summary ||
      !parsed.coachComment ||
      !Array.isArray(parsed.actionItems) ||
      parsed.actionItems.length < 1 ||
      typeof parsed.score !== "number"
    ) {
      return fallbackCoachInsight(metrics)
    }

    return {
      summary: parsed.summary,
      coachComment: parsed.coachComment,
      actionItems: parsed.actionItems.slice(0, 3).map((x) => String(x)),
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    }
  } catch {
    return fallbackCoachInsight(metrics)
  }
}
