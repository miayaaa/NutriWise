import { getServerSession } from "next-auth/next"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { userFastingSchema, userNameSchema, userProfileSchema } from "@/lib/validations/user"

const routeContextSchema = z.object({
  params: z.object({
    userId: z.string(),
  }),
})

export async function PATCH(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const session = await getServerSession(authOptions)

    if (!session?.user || params.userId !== session?.user.id) {
      return new Response(null, { status: 403 })
    }

    const body = await req.json()

    // dailyCalorieGoal update
    if (body.dailyCalorieGoal !== undefined) {
      const payload = userProfileSchema.parse(body)
      await db.user.update({
        where: { id: session.user.id },
        data: { dailyCalorieGoal: payload.dailyCalorieGoal, updatedAt: new Date() },
      })
      return new Response(null, { status: 200 })
    }

    // Fasting window update
    if (body.fastingEnabled !== undefined) {
      const payload = userFastingSchema.parse(body)
      await db.user.update({
        where: { id: session.user.id },
        data: {
          fastingEnabled: payload.fastingEnabled,
          fastingStart: payload.fastingStart,
          fastingEnd: payload.fastingEnd,
          updatedAt: new Date(),
        },
      })
      return new Response(null, { status: 200 })
    }

    // Name update
    const payload = userNameSchema.parse(body)
    await db.user.update({
      where: { id: session.user.id },
      data: { name: payload.name, updatedAt: new Date() },
    })

    return new Response(null, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}
