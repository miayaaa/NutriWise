import { getServerSession } from "next-auth/next"
import * as z from "zod"

import { authOptions } from "@/lib/auth"
import { upsertStepsLog } from "@/lib/api/steps"

const bodySchema = z.object({
  date: z.string(),
  steps: z.number().int().min(0).max(200000),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response("Unauthorized", { status: 403 })

    const json = await req.json()
    const body = bodySchema.parse(json)

    const log = await upsertStepsLog(session.user.id, new Date(body.date), body.steps)
    return Response.json(log)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }
    return new Response(null, { status: 500 })
  }
}
