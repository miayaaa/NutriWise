import Anthropic from "@anthropic-ai/sdk"

type WorkoutAnalysisContext = {
  mode: "strength" | "cardio" | "other"
  strength?: {
    exercise: string
    sets: number
    reps: number
    weightKg?: number
    restSec?: number
  }
  cardio?: {
    cardioType: string
    distanceKm?: number
    avgSpeedKph?: number
    inclinePct?: number
    elevationGainM?: number
  }
  other?: {
    workoutName: string
  }
}

function fallbackWorkoutComment(type: string, durationMin: number) {
  const lowerType = type.toLowerCase()
  const isStrength = /(strength|squat|deadlift|bench|press|row)/.test(lowerType)
  const isCardio = /(cardio|run|walk|cycle|bike|swim|treadmill|elliptical|row)/.test(lowerType)

  if (isStrength) {
    return durationMin >= 45
      ? "Solid strength session. Keep your form sharp on the last reps and add load gradually next time."
      : "Nice lifting work. Prioritize full range of motion and controlled tempo for better progress."
  }

  if (isCardio) {
    return durationMin >= 40
      ? "Great cardio effort. Keep a steady pace and finish with a short cool-down walk."
      : "Good cardio session. Stay consistent and increase either pace or incline a little next workout."
  }

  return durationMin >= 40
    ? "Strong session today. Recover well with hydration, protein, and quality sleep."
    : "Nice work today. Keep consistency high and aim for a small improvement next session."
}

export async function generateWorkoutComment(
  type: string,
  durationMin: number,
  notes?: string,
  analysisContext?: WorkoutAnalysisContext
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return fallbackWorkoutComment(type, durationMin)

  const client = new Anthropic({ apiKey })

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 120,
      temperature: 0.6,
      messages: [
        {
          role: "user",
          content: `The user just completed a ${durationMin}-minute ${type} workout.
Workout details JSON:
${JSON.stringify(analysisContext ?? null)}

Notes:
${notes ?? "n/a"}

Act as a concise fitness coach. Analyze this specific session quality/efficiency using the provided data.
Write exactly 2 short English sentences:
1) one session assessment with an efficiency-focused observation
2) one actionable next-step suggestion
Keep total length under 45 words. Plain text only.`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== "text") return fallbackWorkoutComment(type, durationMin)
    const text = content.text.trim()
    return text || fallbackWorkoutComment(type, durationMin)
  } catch {
    return fallbackWorkoutComment(type, durationMin)
  }
}
