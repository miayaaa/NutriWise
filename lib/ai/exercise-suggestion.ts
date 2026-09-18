export interface ExerciseSuggestionInput {
  todayCalories: number
  dailyCalorieGoal: number | null
  hasLoggedWorkoutToday: boolean
  consecutiveTrainingDays: number
  sedentaryHours: number | null
}

export interface ExerciseSuggestion {
  message: string
  priority: "high" | "medium" | "low"
  kind: "rest" | "sedentary" | "calorie_surplus" | "none"
}

/**
 * Pure diet/activity-linked exercise suggestion logic, shared between the
 * chat system prompt and the activity dashboard card. Recovery always wins
 * over "burn it off" advice — matches the priority ordering already used in
 * buildSystemPrompt() (app/api/ai/chat/route.ts) and fallbackCoachInsight()
 * (lib/ai/coach-insights.ts).
 */
export function getExerciseSuggestion(
  input: ExerciseSuggestionInput
): ExerciseSuggestion | null {
  const {
    todayCalories,
    dailyCalorieGoal,
    hasLoggedWorkoutToday,
    consecutiveTrainingDays,
    sedentaryHours,
  } = input

  if (consecutiveTrainingDays >= 4) {
    return {
      message: `You've trained ${consecutiveTrainingDays} days in a row. Take a rest or active-recovery day — more cardio right now works against recovery, not for it.`,
      priority: "high",
      kind: "rest",
    }
  }

  if (sedentaryHours != null && sedentaryHours >= 3 && !hasLoggedWorkoutToday) {
    return {
      message: `You've been sedentary for ${Math.floor(sedentaryHours)}+ hours with no movement logged today. A short walk (even 5–10 min) activates lipoprotein lipase (LPL) and helps metabolize fat — sitting suppresses it.`,
      priority: "medium",
      kind: "sedentary",
    }
  }

  if (
    dailyCalorieGoal &&
    dailyCalorieGoal > 0 &&
    todayCalories > dailyCalorieGoal * 1.15 &&
    !hasLoggedWorkoutToday
  ) {
    const overPct = Math.round((todayCalories / dailyCalorieGoal - 1) * 100)
    return {
      message: `Today's intake is ${overPct}% over your calorie target. A 20–30 min brisk walk or light cardio session can help offset part of the surplus without overcorrecting.`,
      priority: "medium",
      kind: "calorie_surplus",
    }
  }

  return null
}
