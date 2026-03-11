import { getServerSession } from "next-auth/next"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

const bodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().max(4000),
    })
  ).min(1).max(40),
})

const GOAL_LABELS: Record<string, string> = {
  fat_loss: "Fat Loss",
  muscle_gain: "Muscle Gain",
  body_recomposition: "Body Recomposition",
  maintenance: "Maintenance",
}

async function buildSystemPrompt(userId: string): Promise<string> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 6)

  const [user, todayMeals, recentFoodLogs, recentWorkouts, recentWeights, todayWater] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        dailyCalorieGoal: true,
        dailyWaterGoal: true,
        heightCm: true,
        weightGoalKg: true,
        fitnessGoal: true,
        age: true,
        gender: true,
        fastingEnabled: true,
        fastingStart: true,
        fastingEnd: true,
      },
    }),
    db.foodLog.findMany({
      where: { userId, date: { gte: today, lte: todayEnd } },
      select: { foodDescription: true, aiCalories: true, protein: true, carbs: true, fat: true, mealType: true },
      orderBy: { date: "asc" },
    }),
    db.foodLog.findMany({
      where: { userId, date: { gte: sevenDaysAgo, lt: today } },
      select: { localDate: true, date: true, aiCalories: true, protein: true, mealType: true },
      orderBy: { date: "desc" },
    }),
    db.workoutLog.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
      select: { type: true, durationMin: true, details: true, date: true },
      orderBy: { date: "desc" },
      take: 10,
    }),
    db.weightLog.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      select: { weightKg: true, date: true },
      take: 5,
    }),
    db.waterLog.aggregate({
      where: { userId, date: { gte: today, lte: todayEnd } },
      _sum: { amount: true },
    }),
  ])

  const goalLabel = user?.fitnessGoal ? GOAL_LABELS[user.fitnessGoal] ?? user.fitnessGoal : null
  const latestWeight = recentWeights[0] ?? null
  const todayKcal = todayMeals.reduce((s, m) => s + (m.aiCalories ?? 0), 0)
  const todayProtein = todayMeals.reduce((s, m) => s + (m.protein ?? 0), 0)
  const todayCarbs = todayMeals.reduce((s, m) => s + (m.carbs ?? 0), 0)
  const todayFat = todayMeals.reduce((s, m) => s + (m.fat ?? 0), 0)
  const todayWaterMl = todayWater._sum.amount ?? 0

  // BMR estimate (Mifflin-St Jeor) if we have enough data
  let bmrEstimate: string | null = null
  let proteinTargetG: number | null = null
  if (user?.age && user?.heightCm && latestWeight?.weightKg && user?.gender) {
    const w = latestWeight.weightKg
    const h = user.heightCm
    const a = user.age
    const bmr = user.gender === "female"
      ? 10 * w + 6.25 * h - 5 * a - 161
      : 10 * w + 6.25 * h - 5 * a + 5
    bmrEstimate = `~${Math.round(bmr)} kcal/day (sedentary BMR, ~${Math.round(bmr * 1.375)} kcal at light activity)`
    const multiplier = user.fitnessGoal === "muscle_gain" ? 2.0
      : user.fitnessGoal === "fat_loss" ? 1.8
      : user.fitnessGoal === "body_recomposition" ? 2.0
      : 1.6
    proteinTargetG = Math.round(w * multiplier)
  }

  // Group recent food logs by day for trend context
  const recentDayMap = new Map<string, { kcal: number; protein: number; meals: number }>()
  for (const log of recentFoodLogs) {
    const key = log.localDate ?? log.date.toISOString().split("T")[0]
    const existing = recentDayMap.get(key) ?? { kcal: 0, protein: 0, meals: 0 }
    existing.kcal += log.aiCalories ?? 0
    existing.protein += log.protein ?? 0
    existing.meals += 1
    recentDayMap.set(key, existing)
  }
  const recentDaySummary = Array.from(recentDayMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6)
    .map(([date, d]) => `${date}: ${Math.round(d.kcal)} kcal, ${Math.round(d.protein)}g protein, ${d.meals} meals`)

  type WorkoutDetailsJson = {
    mode?: string
    strength?: { exercise?: string; sets?: number; reps?: number; weightKg?: number }
    cardio?: { cardioType?: string; distanceKm?: number; avgSpeedKph?: number }
    other?: { workoutName?: string }
  }

  const workoutSummary = recentWorkouts.map((w) => {
    const d = (w.details ?? {}) as WorkoutDetailsJson
    const date = w.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    if (d.mode === "strength" && d.strength) {
      const s = d.strength
      return `${date}: Strength — ${s.exercise ?? "exercise"} ${s.sets}x${s.reps}${s.weightKg ? ` @${s.weightKg}kg` : ""} (${w.durationMin}min)`
    }
    if (d.mode === "cardio" && d.cardio) {
      const c = d.cardio
      return `${date}: Cardio — ${c.cardioType ?? "cardio"}${c.distanceKm ? ` ${c.distanceKm}km` : ""}${c.avgSpeedKph ? ` @${c.avgSpeedKph}km/h` : ""} (${w.durationMin}min)`
    }
    return `${date}: ${w.type} (${w.durationMin}min)`
  })

  const mealSummary = todayMeals.map((m) =>
    `${m.mealType}: ${m.foodDescription}${m.aiCalories ? ` (${Math.round(m.aiCalories)} kcal)` : ""}`
  )

  const weightTrend = recentWeights.length >= 2
    ? recentWeights.slice().reverse().map((w) =>
        `${w.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${w.weightKg} kg`
      ).join(" → ")
    : null

  return `You are a professional personal trainer and sports nutritionist acting as ${user?.name ? `${user.name}'s` : "the user's"} dedicated AI fitness coach.

## User Profile
- Name: ${user?.name ?? "User"}
- Age: ${user?.age ?? "Not set"}
- Gender: ${user?.gender ?? "Not set"}
- Height: ${user?.heightCm ? `${user.heightCm} cm` : "Not set"}
- Current Weight: ${latestWeight ? `${latestWeight.weightKg} kg` : "Not logged"}
- Weight Goal: ${user?.weightGoalKg ? `${user.weightGoalKg} kg` : "Not set"}
- Weight Trend: ${weightTrend ?? (recentWeights.length === 1 ? `${recentWeights[0].weightKg} kg (only 1 log)` : "No weight logs")}
- Estimated BMR: ${bmrEstimate ?? "Not enough data (need age, height, weight, gender in Settings)"}
- Daily Calorie Target: ${user?.dailyCalorieGoal ? `${user.dailyCalorieGoal} kcal` : "Not set"}
- Protein Target: ${proteinTargetG ? `${proteinTargetG}g/day (${user?.fitnessGoal === "fat_loss" ? "1.8" : "2.0"}g/kg for ${goalLabel})` : "Not calculable (need weight)"}
- Fitness Goal: ${goalLabel ?? "Not set — ask them to set it in Settings"}
- Fasting: ${user?.fastingEnabled ? `Enabled (eating window ${user.fastingStart}:00–${user.fastingEnd}:00)` : "Not enabled"}

## Today's Nutrition
- Calories: ${Math.round(todayKcal)} kcal${user?.dailyCalorieGoal ? ` / ${user.dailyCalorieGoal} kcal goal (${Math.round((todayKcal / user.dailyCalorieGoal) * 100)}% of target)` : ""}
- Macros: ${Math.round(todayProtein)}g protein${proteinTargetG ? ` (target: ${proteinTargetG}g, ${Math.round((todayProtein / proteinTargetG) * 100)}% hit)` : ""}, ${Math.round(todayCarbs)}g carbs, ${Math.round(todayFat)}g fat
- Water: ${todayWaterMl} ml${user?.dailyWaterGoal ? ` / ${user.dailyWaterGoal} ml goal` : ""}
${mealSummary.length > 0 ? `- Meals:\n${mealSummary.map((m) => `  • ${m}`).join("\n")}` : "- No meals logged today yet"}

## Recent Nutrition Trend (past 6 days)
${recentDaySummary.length > 0 ? recentDaySummary.map((d) => `- ${d}`).join("\n") : "- No food logs in the past 6 days"}

## Recent Workouts (last 7 days)
${workoutSummary.length > 0 ? workoutSummary.map((w) => `- ${w}`).join("\n") : "- No workouts logged in the last 7 days"}

## Coaching Style
- Be direct and specific. Give real numbers (reps, sets, weight, calories, grams).
- Reference their actual logged data when relevant (e.g. "Your bench press was 60kg last session — aim for 62.5kg next time").
- Base ALL advice on their real records above, not generic recommendations.
- If they haven't set a fitness goal, encourage them to do so in Settings for better advice.
- Tailor ALL advice to their stated fitness goal.
- For muscle_gain: push progressive overload, protein ≥2g/kg body weight, limit steady-state cardio.
- For fat_loss: maintain calorie deficit, high protein to preserve muscle, add cardio frequency.
- For body_recomposition: slight deficit or maintenance, maximum protein, strength training priority.
- For maintenance: balance, avoid overtraining, consistent habits.
- If the user is doing intermittent fasting, factor timing into all nutrition advice: front-load protein and calories within the eating window, time workouts to align with or just before the eating window, avoid recommending food outside their window.
- Keep responses concise but substantive. Use bullet points for action items.
- Do not be overly cautious or add excessive disclaimers.`
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return new Response("Unauthorized", { status: 403 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response("AI not configured", { status: 503 })

  let messages: z.infer<typeof bodySchema>["messages"]
  try {
    const json = await req.json()
    messages = bodySchema.parse(json).messages
  } catch {
    return new Response("Invalid request", { status: 422 })
  }

  const systemPrompt = await buildSystemPrompt(session.user.id)
  const client = new Anthropic({ apiKey })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        })

        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
