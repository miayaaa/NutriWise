import { getServerSession } from "next-auth/next"
import Anthropic from "@anthropic-ai/sdk"
import { authOptions } from "@/lib/auth"
import { CalorieEstimate } from "@/lib/ai/calories"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

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
      max_tokens: 400,
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
              text: `Identify the food in this image and estimate its nutrition.

Respond ONLY with valid JSON (no markdown):
{"description":"<natural description of what you see, e.g. '2 scrambled eggs with toast and butter'>","calories":<int>,"protein":<int>,"carbs":<int>,"fat":<int>,"breakdown":[{"item":"<name>","calories":<int>}],"confidence":"<high|medium|low>","comment":"<1 concise coaching sentence, max 20 words>"}

Rules:
- description: write as if the user described the meal themselves, natural language
- If you cannot identify food, set confidence to "low" and describe what you see
- Keep calories/macros realistic
- No extra keys`,
            },
          ],
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== "text") return new Response("AI error", { status: 500 })

    const raw = content.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    const parsed = JSON.parse(raw) as CalorieEstimate & { description: string }

    return Response.json(parsed)
  } catch {
    return new Response("Failed to process image", { status: 500 })
  }
}
