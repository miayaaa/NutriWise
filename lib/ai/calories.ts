import Anthropic from "@anthropic-ai/sdk"

export interface CalorieEstimate {
  calories: number
  protein: number
  carbs: number
  fat: number
  breakdown: Array<{ item: string; calories: number }>
  confidence: "high" | "medium" | "low"
  comment?: string
}

export async function estimateCalories(
  foodDescription: string
): Promise<CalorieEstimate | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const client = new Anthropic({ apiKey })

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 260,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: `Estimate nutrition for: "${foodDescription}"

Respond ONLY with valid JSON (no markdown):
{"calories":<int>,"protein":<int>,"carbs":<int>,"fat":<int>,"breakdown":[{"item":"<name>","calories":<int>}],"confidence":"<high|medium|low>","comment":"<exactly 1 concise English coaching sentence with encouragement + one practical next step, max 20 words>"}}

Rules:
- Keep calories/macros realistic and internally consistent.
- Comment tone: professional, warm, actionable.
- Do not use warnings unless strongly necessary.
- No extra keys.`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== "text") return null

    const raw = content.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    return JSON.parse(raw) as CalorieEstimate
  } catch {
    return null
  }
}
