import { getServerSession } from "next-auth/next"
import * as z from "zod"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

const bodySchema = z.object({
  foodDescription: z.string().min(1).max(2000),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]).default("SNACK"),
  aiCalories: z.number().min(0).optional(),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  fiber: z.number().min(0).optional(),
  aiComment: z.string().max(200).optional(),
  date: z.string().optional(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // Current local hour (0-23) at the client — needed to check the fasting
  // window server-side. Omit to skip the fasting check (e.g. manual backfill).
  localHour: z.number().int().min(0).max(23).optional(),
  // Confirms the user wants to log outside their fasting window anyway.
  override: z.boolean().optional(),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new Response("Unauthorized", { status: 403 })
    }

    const json = await req.json()
    const body = bodySchema.parse(json)

    if (body.localHour != null && !body.override) {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { fastingEnabled: true, fastingStart: true, fastingEnd: true },
      })

      if (user?.fastingEnabled) {
        const { fastingStart, fastingEnd } = user
        const inWindow = fastingEnd > fastingStart
          ? body.localHour >= fastingStart && body.localHour < fastingEnd
          : body.localHour >= fastingStart || body.localHour < fastingEnd

        if (!inWindow) {
          return Response.json(
            {
              error: "fasting_violation",
              message: `This is outside your eating window (${fastingStart}:00–${fastingEnd}:00). Log anyway?`,
            },
            { status: 409 }
          )
        }
      }
    }

    const log = await db.foodLog.create({
      data: {
        userId: session.user.id,
        foodDescription: body.foodDescription,
        mealType: body.mealType,
        aiCalories: body.aiCalories,
        protein: body.protein,
        carbs: body.carbs,
        fat: body.fat,
        fiber: body.fiber,
        aiComment: body.aiComment,
        date: body.date ? new Date(body.date) : new Date(),
        localDate: body.localDate,
      },
      select: { id: true, aiCalories: true },
    })

    return Response.json(log)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }
    return new Response(null, { status: 500 })
  }
}
