import Anthropic from "@anthropic-ai/sdk"

export interface ParsedWorkout {
  type: string
  durationMin: number
  analysisContext:
    | {
        mode: "cardio"
        cardio: {
          cardioType: string
          distanceKm?: number
          avgSpeedKph?: number
          inclinePct?: number
          elevationGainM?: number
        }
      }
    | {
        mode: "strength"
        strength: {
          exercise: string
          setRows: Array<{ reps: number; weightKg?: number }>
          restSec?: number
        }
      }
    | {
        mode: "other"
        other: { workoutName: string }
      }
  confidence: "high" | "medium" | "low"
  comment?: string
}

export async function parseExerciseText(
  text: string
): Promise<ParsedWorkout | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const client = new Anthropic({ apiKey })

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: `Parse this free-text exercise log (may be Chinese or English) into structured workout data: "${text}"

Respond ONLY with valid JSON (no markdown), matching exactly one of these shapes based on the exercise type:

Cardio: {"type":"<short label e.g. 'Running'>","durationMin":<int>,"analysisContext":{"mode":"cardio","cardio":{"cardioType":"<e.g. running, cycling, swimming>","distanceKm":<number, omit if not applicable>,"avgSpeedKph":<number, omit if unknown>,"inclinePct":<number, omit if not mentioned>,"elevationGainM":<number, omit if not mentioned>}},"confidence":"<high|medium|low>","comment":"<optional 1 short sentence>"}

Strength: {"type":"<short label e.g. 'Strength Training'>","durationMin":<int>,"analysisContext":{"mode":"strength","strength":{"exercise":"<name>","setRows":[{"reps":<int>,"weightKg":<number, omit if bodyweight>}],"restSec":<int, omit if not mentioned>}},"confidence":"<high|medium|low>","comment":"<optional>"}

Other: {"type":"<short label>","durationMin":<int>,"analysisContext":{"mode":"other","other":{"workoutName":"<name>"}},"confidence":"<high|medium|low>","comment":"<optional>"}

Rules:
- If duration isn't stated but distance/pace is (e.g. "jogged 3.5km"), ESTIMATE durationMin using a realistic pace (easy jog ~6 min/km, run ~5 min/km, walk ~12 min/km, cycling ~3 min/km) and set confidence to "medium" since duration is inferred, not stated.
- If duration and distance are both stated, confidence is "high" and compute avgSpeedKph = distanceKm / (durationMin/60).
- If the text is too vague to parse (no exercise type, no duration/distance clue), respond with {"type":"Unknown","durationMin":0,"analysisContext":{"mode":"other","other":{"workoutName":"Unknown"}},"confidence":"low"}.
- durationMin must be a positive integer between 1 and 600 (unless truly unparseable, see above).
- No extra keys beyond what's specified.`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== "text") return null

    const raw = content.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    return JSON.parse(raw) as ParsedWorkout
  } catch {
    return null
  }
}
