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
  date: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new Response("Unauthorized", { status: 403 })
    }

    const json = await req.json()
    const body = bodySchema.parse(json)

    const log = await db.foodLog.create({
      data: {
        userId: session.user.id,
        foodDescription: body.foodDescription,
        mealType: body.mealType,
        aiCalories: body.aiCalories,
        protein: body.protein,
        carbs: body.carbs,
        fat: body.fat,
        date: body.date ? new Date(body.date) : new Date(),
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
