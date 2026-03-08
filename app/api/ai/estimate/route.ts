import { getServerSession } from "next-auth/next"
import * as z from "zod"

import { estimateCalories } from "@/lib/ai/calories"
import { authOptions } from "@/lib/auth"

const bodySchema = z.object({
  foodDescription: z.string().min(1).max(2000),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response("Unauthorized", { status: 403 })
  }

  try {
    const json = await req.json()
    const { foodDescription } = bodySchema.parse(json)
    const estimate = await estimateCalories(foodDescription)
    if (!estimate) {
      return new Response(JSON.stringify({ error: "Could not estimate" }), {
        status: 422,
      })
    }
    return new Response(JSON.stringify(estimate))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }
    return new Response(null, { status: 500 })
  }
}
