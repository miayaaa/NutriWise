import { getServerSession } from "next-auth/next"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"

import { authOptions } from "@/lib/auth"
import { buildSystemPrompt } from "@/lib/ai/coach-context"

const bodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().max(4000),
    })
  ).min(1).max(40),
})

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
