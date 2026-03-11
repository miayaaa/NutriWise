import { getServerSession } from "next-auth/next"
import * as z from "zod"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

const routeContextSchema = z.object({
  params: z.object({
    logId: z.string(),
  }),
})

const patchSchema = z.object({
  foodDescription: z.string().min(1).max(500).optional(),
  aiCalories: z.number().min(0).max(10000).optional(),
  protein: z.number().min(0).max(1000).optional(),
  carbs: z.number().min(0).max(1000).optional(),
  fat: z.number().min(0).max(1000).optional(),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]).optional(),
})

export async function PATCH(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response("Unauthorized", { status: 403 })

    const { params } = routeContextSchema.parse(context)
    const body = patchSchema.parse(await req.json())

    const log = await db.foodLog.findFirst({
      where: { id: params.logId, userId: session.user.id },
    })
    if (!log) return new Response(null, { status: 404 })

    const updated = await db.foodLog.update({
      where: { id: params.logId },
      data: body,
    })

    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }
    return new Response(null, { status: 500 })
  }
}

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
