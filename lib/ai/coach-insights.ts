import Anthropic from "@anthropic-ai/sdk"

export interface CoachInsightMetrics {
  rangeType: "7d" | "30d" | "90d"
  period: { startDate: string; endDate: string; days: number }
  fitnessGoal: string | null
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
    sessions: Record<string, unknown>[]
  }
  weight: {
    logCount: number
    currentKg: number | null
    avgKg: number | null
    changeKg: number
    goalKg: number | null
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

const GOAL_LABELS: Record<string, string> = {
  fat_loss: "Fat Loss",
  muscle_gain: "Muscle Gain",
  body_recomposition: "Body Recomposition",
  maintenance: "Maintenance",
}

function fallbackCoachInsight(metrics: CoachInsightMetrics): CoachInsightResult {
  const hydrationPct = metrics.hydration.dailyGoalMl > 0
    ? Math.min((metrics.hydration.avgWaterMlPerDay / metrics.hydration.dailyGoalMl) * 100, 100)
    : 0
  const weightTrendText =
    metrics.weight.logCount >= 2
      ? `Weight trend ${metrics.weight.changeKg > 0 ? "+" : ""}${metrics.weight.changeKg.toFixed(1)} kg.`
      : "Weight trend needs more logs."
  const workoutDaysScore = Math.min(metrics.workout.sessionCount * 10, 40)
  const hydrationScore = Math.round(hydrationPct * 0.3)
  const nutritionScore = metrics.nutrition.mealCount > 0 ? 30 : 10
  const score = Math.max(20, Math.min(100, workoutDaysScore + hydrationScore + nutritionScore))

  const goal = metrics.fitnessGoal
  const actionItems = [
    `Keep hydration above ${Math.round(metrics.hydration.dailyGoalMl * 0.9)} ml/day.`,
    metrics.workout.sessionCount >= 3
      ? goal === "muscle_gain"
        ? "Add 5% progressive overload on your main compound lifts this week."
        : goal === "fat_loss"
        ? "Add one 20-min cardio session on top of your current schedule."
        : "Maintain consistency and add progressive overload to one session."
      : goal === "fat_loss"
      ? "Target 4 sessions: 2 strength + 2 cardio. Short sessions count."
      : "Add at least 3 workout sessions. Consistency beats intensity early on.",
    goal === "muscle_gain"
      ? `Protein target: ${Math.round((metrics.weight.currentKg ?? 70) * 2.0)}g/day. Prioritize it at every meal.`
      : goal === "fat_loss"
      ? `Keep daily calories around ${Math.round((metrics.weight.currentKg ?? 70) * 26)} kcal and protein high to preserve muscle.`
      : "Aim for balanced macros: 30% protein, 40% carbs, 30% fat per meal.",
  ]

  return {
    summary: `You logged ${metrics.nutrition.mealCount} meals, ${metrics.workout.sessionCount} workouts, and averaged ${Math.round(metrics.hydration.avgWaterMlPerDay)} ml water/day over ${metrics.period.days} days. ${weightTrendText}`,
    coachComment: goal
      ? `Coaching for ${GOAL_LABELS[goal] ?? goal}: keep the basics consistent and make one measurable improvement this week.`
      : "Good momentum overall. Keep the basics consistent and make one small measurable improvement this week.",
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
      max_tokens: 500,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: `You are an expert personal trainer and sports nutritionist. Be direct, specific, and professional — like a real coach, not a chatbot. Do not be vague or overly cautious.

User's fitness goal: ${metrics.fitnessGoal ? GOAL_LABELS[metrics.fitnessGoal] ?? metrics.fitnessGoal : "Not set — give general advice"}

Data (${metrics.period.days}-day window):
${JSON.stringify(metrics, null, 0)}

Analyze the data and return ONLY valid JSON, no markdown:
{"summary":"<1 sentence: key stats — meals, workouts, weight trend>","coachComment":"<2-3 sentences: honest coach assessment aligned to their goal. Call out what's lacking. Be specific>","actionItems":["<concrete workout instruction: e.g. 'Increase bench press to 3x5 at 85% 1RM' or 'Add 2x20min Zone-2 cardio'>","<nutrition instruction tied to their goal: specific grams or calories>","<recovery or consistency action>"],"score":<int 0-100 based on goal alignment, not just effort>}

Rules:
- Base ALL advice on their stated fitness goal
- For muscle_gain: push progressive overload, protein ≥2g/kg, limited cardio
- For fat_loss: calorie deficit, preserve muscle via protein ≥1.8g/kg, add cardio
- For body_recomposition: slight deficit, high protein ≥2g/kg, strength training priority
- For maintenance: balance, consistency, avoid overtraining
- If workout sessions are missing or low, say so directly — "You only trained X times. That is not enough for [goal]."
- If specific exercises are logged (e.g. bench press 60kg), reference them: "Your bench press weight looks low for muscle gain — aim for 3x5 at RPE 8"
- Score reflects goal achievement, not just showing up
- No filler phrases like "Great job" unless truly warranted
- English only, no extra keys`,
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
