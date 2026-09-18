import { getServerSession } from "next-auth/next"
import Anthropic from "@anthropic-ai/sdk"
import { authOptions } from "@/lib/auth"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

export interface StepsEstimate {
  steps: number
  confidence: "high" | "medium" | "low"
  comment?: string
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return new Response("Unauthorized", { status: 403 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response("AI not configured", { status: 503 })

  try {
    const formData = await req.formData()
    const file = formData.get("image") as File | null
    if (!file) return new Response("No image provided", { status: 422 })
    if (file.size > MAX_IMAGE_BYTES) return new Response("Image too large (max 5 MB)", { status: 422 })

    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString("base64")
    const mediaType = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif"

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `This is a screenshot from a phone's step counter, fitness app, or smartwatch (e.g. Apple Health, Google Fit, a wearable's activity ring). Find TODAY's step count.

Respond ONLY with valid JSON (no markdown):
{"steps":<int>,"confidence":"<high|medium|low>","comment":"<optional 1 short sentence, max 15 words, omit if nothing notable>"}

Rules:
- Look for a number labeled "steps", "步数", or shown next to a footprint/walking icon. Prefer the total clearly associated with "Today" over a weekly/monthly chart value.
- If multiple numbers are visible (e.g. a weekly bar chart), pick the one for today, not a sum or average.
- If you cannot find a clear step count, set steps to 0 and confidence to "low".
- No extra keys.`,
            },
          ],
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== "text") return new Response("AI error", { status: 500 })

    const raw = content.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    const parsed = JSON.parse(raw) as StepsEstimate

    return Response.json(parsed)
  } catch {
    return new Response("Failed to process image", { status: 500 })
  }
}
