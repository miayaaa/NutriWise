import { getServerSession } from "next-auth/next"
import { z } from "zod"

import { getCoachInsight } from "@/lib/api/coach-insights"
import { authOptions } from "@/lib/auth"

const querySchema = z.object({
  range: z.enum(["7d", "30d", "90d"]).default("7d"),
})

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response("Unauthorized", { status: 403 })

    const url = new URL(req.url)
    const parsed = querySchema.parse({
      range: url.searchParams.get("range") ?? undefined,
    })

    const insight = await getCoachInsight(session.user.id, parsed.range)
    return Response.json(insight)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }
    return new Response(null, { status: 500 })
  }
}
