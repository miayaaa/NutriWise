import { getServerSession } from "next-auth/next"
import * as z from "zod"

import { parseExerciseText } from "@/lib/ai/exercise-parser"
import { authOptions } from "@/lib/auth"

const bodySchema = z.object({
  text: z.string().min(1).max(500),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return new Response("Unauthorized", { status: 403 })

  try {
    const json = await req.json()
    const { text } = bodySchema.parse(json)
    const parsed = await parseExerciseText(text)
    if (!parsed) {
      return new Response(JSON.stringify({ error: "Could not parse exercise" }), {
        status: 422,
      })
    }
    return Response.json(parsed)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }
    return new Response(null, { status: 500 })
  }
}
