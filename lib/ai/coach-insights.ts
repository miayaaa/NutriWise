import Anthropic from "@anthropic-ai/sdk"

export interface CoachInsightMetrics {
  rangeType: "7d" | "30d" | "90d"
  period: { startDate: string; endDate: string; days: number }
  fitnessGoal: string | null
  nutrition: {
    mealCount: number
    daysLogged: number
    daysWithNoLog: number
    avgMealsPerDay: number
    totalCalories: number
    avgCaloriesPerDay: number
    avgCaloriesPerLoggedDay: number
    dailyCalorieGoal: number | null
    avgCaloriesPerMeal: number
    avgProteinPerDay: number
    avgCarbsPerDay: number
    avgFatPerDay: number
  }
  profile: {
    age: number | null
    gender: string | null
    heightCm: number | null
    bmrKcal: number | null
    tdeeKcal: number | null
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
  const bodyWeightKg = metrics.weight.currentKg ?? 70
  const proteinTarget = Math.round(bodyWeightKg * (goal === "fat_loss" ? 1.8 : 2.0))
  const caloireTarget = metrics.nutrition.dailyCalorieGoal
    ?? metrics.profile.tdeeKcal
    ?? Math.round(bodyWeightKg * (goal === "fat_loss" ? 26 : 33))

  const avgDailyKcal = metrics.nutrition.avgCaloriesPerLoggedDay
  const bmr = metrics.profile.bmrKcal
  const intakeIsCriticallyLow = avgDailyKcal > 0 && (avgDailyKcal < 1000 || (bmr != null && avgDailyKcal < bmr * 0.75))
  const intakeIsAdequate = !intakeIsCriticallyLow

  const actionItems = [
    `Keep hydration above ${Math.round(metrics.hydration.dailyGoalMl * 0.9)} ml/day.`,
    intakeIsCriticallyLow
      ? `Your average intake of ${Math.round(avgDailyKcal)} kcal/day is too low${bmr != null ? ` (BMR is ~${bmr} kcal)` : ""}. Increase to at least ${Math.round((bmr ?? 1400) * 0.85)} kcal before adding workout intensity — low intake accelerates muscle loss.`
      : metrics.workout.sessionCount >= 3
      ? goal === "muscle_gain"
        ? "Add 5% progressive overload on your main compound lifts this week."
        : goal === "fat_loss" && intakeIsAdequate
        ? "Add one 20-min cardio session on top of your current schedule."
        : "Maintain consistency and add progressive overload to one session."
      : goal === "fat_loss"
      ? "Target 3–4 sessions: mix strength and cardio. Short sessions count."
      : "Add at least 3 workout sessions. Consistency beats intensity early on.",
    goal === "muscle_gain"
      ? `Protein target: ${proteinTarget}g/day (2g/kg). Prioritize it at every meal.`
      : goal === "fat_loss"
      ? `Keep daily calories around ${caloireTarget} kcal and hit ${proteinTarget}g protein/day to preserve muscle.`
      : `Aim for ${proteinTarget}g protein/day and ~${caloireTarget} kcal. Balance macros: 30% protein, 40% carbs, 30% fat.`,
  ]

  return {
    summary: `Over ${metrics.period.days} days: ${metrics.nutrition.mealCount} meals (avg ${metrics.nutrition.avgMealsPerDay}/day), ${metrics.workout.sessionCount} workouts, ${Math.round(metrics.hydration.avgWaterMlPerDay)} ml water/day avg. ${weightTrendText}`,
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
User profile: age=${metrics.profile.age ?? "?"}, gender=${metrics.profile.gender ?? "?"}, height=${metrics.profile.heightCm ? `${metrics.profile.heightCm}cm` : "?"}, BMR=${metrics.profile.bmrKcal ? `~${metrics.profile.bmrKcal} kcal/day` : "unknown"}, TDEE estimate=${metrics.profile.tdeeKcal ? `~${metrics.profile.tdeeKcal} kcal/day (light activity)` : "unknown"}
Intermittent fasting: ${metrics.fasting.enabled ? `YES — eating window ${metrics.fasting.startHour}:00–${metrics.fasting.endHour}:00 (${metrics.fasting.endHour - metrics.fasting.startHour}h eating / ${24 - (metrics.fasting.endHour - metrics.fasting.startHour)}h fast)` : "Not enabled"}

Data (${metrics.period.days}-day window — all totals are across the FULL window):
IMPORTANT: The user logged food on ${metrics.nutrition.daysLogged} of ${metrics.period.days} days (missed ${metrics.nutrition.daysWithNoLog} days). avgMealsPerDay=${metrics.nutrition.avgMealsPerDay}. avgCaloriesPerLoggedDay=${metrics.nutrition.avgCaloriesPerLoggedDay} kcal. dailyCalorieGoal=${metrics.nutrition.dailyCalorieGoal ?? "not set"}.
Do NOT say the user ate ${metrics.nutrition.mealCount} meals in one day — that is a ${metrics.period.days}-day total.
${JSON.stringify(metrics, null, 0)}

Analyze the data and return ONLY valid JSON, no markdown:
{"summary":"<1 sentence: key stats — meals, workouts, weight trend>","coachComment":"<2-3 sentences: honest coach assessment aligned to their goal. Call out what's lacking. Be specific>","actionItems":["<concrete workout instruction: e.g. 'Increase bench press to 3x5 at 85% 1RM' or 'Add 2x20min Zone-2 cardio'>","<nutrition instruction tied to their goal: specific grams or calories>","<recovery or consistency action>"],"score":<int 0-100 based on goal alignment, not just effort>}

Rules:
- PRIORITY CHECK FIRST: If avgCaloriesPerLoggedDay < 1000 or < 75% of BMR, the #1 action item MUST be increasing calorie intake — do NOT recommend more cardio or intensity. Low intake causes muscle loss and metabolic slowdown regardless of goal.
- Base ALL advice on their stated fitness goal
- For muscle_gain: push progressive overload, protein ≥2g/kg, limited cardio
- For fat_loss: moderate deficit (~300–500 kcal below TDEE, never below BMR), preserve muscle via protein ≥1.8g/kg. Only add cardio if intake is adequate.
- For body_recomposition: slight deficit, high protein ≥2g/kg, strength training priority
- For maintenance: balance, consistency, avoid overtraining
- If workout sessions are missing or low, say so directly — "You only trained X times. That is not enough for [goal]."
- If specific exercises are logged (e.g. bench press 60kg), reference them: "Your bench press weight looks low for muscle gain — aim for 3x5 at RPE 8"
- If intermittent fasting is enabled, factor meal timing into advice (e.g. front-loading protein within the eating window, pre/post-workout nutrition within the window)
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
