import { getServerSession } from "next-auth/next"
import * as z from "zod"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

const routeContextSchema = z.object({
  params: z.object({
    logId: z.string(),
  }),
})

export async function DELETE(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new Response("Unauthorized", { status: 403 })
    }

    const { params } = routeContextSchema.parse(context)

    // Verify the log belongs to the current user
    const log = await db.foodLog.findFirst({
      where: { id: params.logId, userId: session.user.id },
    })

    if (!log) {
      return new Response(null, { status: 404 })
    }

    await db.foodLog.delete({ where: { id: params.logId } })

    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }
    return new Response(null, { status: 500 })
  }
}
