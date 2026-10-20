import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { getCoachInsight } from "@/lib/api/coach-insights"
import { getProgressPhotos, PHOTO_ANGLES } from "@/lib/api/progress-photos"
import { estimateCalories } from "@/lib/ai/calories"
import { buildSystemPrompt } from "@/lib/ai/coach-context"
import { db } from "@/lib/db"
import { isInEatingWindow } from "@/lib/fasting"
import { readPhotoBuffer } from "@/lib/storage/photos"

function text(value: unknown) {
  return {
    content: [
      { type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) },
    ],
  }
}

function errorText(message: string) {
  return { ...text(message), isError: true }
}

// "2026-10-20T12:30:00+08:00" → local date/hour as the user sees them.
const loggedAtSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/)
  .optional()
  .describe(
    "When it happened, as ISO 8601 in the user's local time WITH UTC offset, e.g. 2026-10-20T12:30:00+08:00. Omit for 'just now'."
  )

function parseLoggedAt(loggedAt: string | undefined) {
  if (!loggedAt) return { date: new Date(), localDate: undefined, localHour: undefined }
  return {
    date: new Date(loggedAt),
    localDate: loggedAt.slice(0, 10),
    localHour: Number(loggedAt.slice(11, 13)),
  }
}

/** One server per request, bound to the authenticated user — every query is scoped to userId. */
export function createNutriWiseMcpServer(userId: string) {
  const server = new McpServer({ name: "nutriwise", version: "1.0.0" })

  server.registerTool(
    "get_today_summary",
    {
      title: "Get today's coaching context",
      description:
        "Returns the user's profile, goals, today's meals/calories/macros/water, 6-day nutrition trend, recent workouts, consecutive training days, menstrual cycle phase, active priority alerts, and NutriWise's coaching rules. Call this before giving any nutrition or training advice, and follow its priority rules (nutrition adequacy first, recovery second).",
      annotations: { readOnlyHint: true },
    },
    async () => text(await buildSystemPrompt(userId))
  )

  server.registerTool(
    "log_food",
    {
      title: "Log food",
      description:
        "Log something the user ate. If calories are not given, NutriWise estimates calories and macros with AI (±20-40% error — mention this when the confidence is low). Returns the log id (needed to undo with delete_food_log). If the user has intermittent fasting enabled and this falls outside their eating window, nothing is logged and you must ask the user to confirm, then retry with overrideFastingWindow: true.",
      inputSchema: {
        description: z.string().min(1).max(2000).describe("What was eaten, with portions if known, e.g. '一碗牛肉面，大碗'"),
        mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
        loggedAt: loggedAtSchema,
        calories: z.number().min(0).max(10000).optional().describe("Only if the user stated it (e.g. from a label)"),
        protein: z.number().min(0).max(1000).optional(),
        carbs: z.number().min(0).max(2000).optional(),
        fat: z.number().min(0).max(1000).optional(),
        fiber: z.number().min(0).max(500).optional(),
        overrideFastingWindow: z.boolean().optional(),
      },
    },
    async (args) => {
      const { date, localDate, localHour } = parseLoggedAt(args.loggedAt)

      if (localHour != null && !args.overrideFastingWindow) {
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { fastingEnabled: true, fastingStart: true, fastingEnd: true },
        })
        if (user?.fastingEnabled && !isInEatingWindow(localHour, user.fastingStart, user.fastingEnd)) {
          return text(
            `NOT LOGGED: ${localHour}:00 is outside the user's eating window (${user.fastingStart}:00–${user.fastingEnd}:00). Ask the user whether to log it anyway; if yes, call log_food again with overrideFastingWindow: true.`
          )
        }
      }

      const estimate = args.calories == null ? await estimateCalories(args.description) : null

      const log = await db.foodLog.create({
        data: {
          userId,
          foodDescription: args.description,
          mealType: args.mealType,
          aiCalories: args.calories ?? estimate?.calories,
          protein: args.protein ?? estimate?.protein,
          carbs: args.carbs ?? estimate?.carbs,
          fat: args.fat ?? estimate?.fat,
          fiber: args.fiber ?? estimate?.fiber,
          aiComment: estimate?.comment?.slice(0, 200),
          date,
          localDate: localDate ?? date.toISOString().slice(0, 10),
        },
        select: { id: true, foodDescription: true, mealType: true, aiCalories: true, protein: true, carbs: true, fat: true, fiber: true, localDate: true },
      })

      return text({
        logged: log,
        source: args.calories != null ? "user-provided" : estimate ? "ai-estimate" : "no-estimate-available",
        confidence: estimate?.confidence,
        breakdown: estimate?.breakdown,
        coachComment: estimate?.comment,
      })
    }
  )

  server.registerTool(
    "delete_food_log",
    {
      title: "Delete a food log",
      description: "Delete one of the user's food logs by id (e.g. to undo a mistaken log_food).",
      inputSchema: { id: z.string().min(1) },
      annotations: { destructiveHint: true },
    },
    async ({ id }) => {
      const { count } = await db.foodLog.deleteMany({ where: { id, userId } })
      return count ? text(`Deleted food log ${id}.`) : errorText(`No food log ${id} found for this user.`)
    }
  )

  server.registerTool(
    "log_workout",
    {
      title: "Log workout",
      description: "Log a workout the user did. Machine-reported calories are ±30% estimates.",
      inputSchema: {
        type: z.string().min(1).max(100).describe("e.g. 'Strength - legs', 'Running', 'Yoga'"),
        durationMin: z.number().int().min(1).max(600),
        notes: z.string().max(500).optional().describe("Exercises, sets/reps/weights, distance, how it felt"),
        machineKcal: z.number().min(0).max(5000).optional(),
        distanceKm: z.number().min(0).max(1000).optional(),
        loggedAt: loggedAtSchema,
      },
    },
    async (args) => {
      const isCardio = args.machineKcal != null || args.distanceKm != null
      const log = await db.workoutLog.create({
        data: {
          userId,
          type: args.type,
          durationMin: args.durationMin,
          notes: args.notes,
          details: isCardio
            ? { mode: "cardio", cardio: { cardioType: args.type, machineKcal: args.machineKcal, distanceKm: args.distanceKm } }
            : { mode: "other", other: { workoutName: args.type } },
          date: parseLoggedAt(args.loggedAt).date,
        },
        select: { id: true, type: true, durationMin: true, date: true },
      })
      return text({ logged: log })
    }
  )

  server.registerTool(
    "log_weight",
    {
      title: "Log weight",
      description: "Log the user's body weight in kg (convert from jin/lb first: 1 斤 = 0.5 kg, 1 lb = 0.4536 kg).",
      inputSchema: {
        weightKg: z.number().min(25).max(350),
        loggedAt: loggedAtSchema,
      },
    },
    async ({ weightKg, loggedAt }) => {
      const log = await db.weightLog.create({
        data: { userId, weightKg, date: parseLoggedAt(loggedAt).date },
        select: { id: true, weightKg: true, date: true },
      })
      return text({ logged: log })
    }
  )

  server.registerTool(
    "log_water",
    {
      title: "Log water",
      description: "Log water the user drank, in ml (a typical glass is ~250 ml).",
      inputSchema: { amountMl: z.number().int().min(1).max(2000) },
    },
    async ({ amountMl }) => {
      const log = await db.waterLog.create({
        data: { userId, amount: amountMl },
        select: { id: true, amount: true, date: true },
      })
      return text({ logged: log })
    }
  )

  server.registerTool(
    "get_insights",
    {
      title: "Get progress insights",
      description:
        "Get NutriWise's periodic coach insight for the last 7, 30 or 90 days: summary, score, coach comment and action items (cached for 12h).",
      inputSchema: { range: z.enum(["7d", "30d", "90d"]).default("7d") },
      annotations: { readOnlyHint: true },
    },
    async ({ range }) => text(await getCoachInsight(userId, range))
  )

  server.registerTool(
    "get_progress_photos",
    {
      title: "Compare progress photos",
      description:
        "Returns the user's progress photos for one angle as images — the earliest on/after fromDate and the latest on/before toDate (default: first vs most recent) — with the weight and waist logged within ±3 days of each, plus all available photo dates. Lighting, pose and water retention (e.g. luteal phase) affect photos; compare trends cautiously and kindly.",
      inputSchema: {
        angle: z.enum(PHOTO_ANGLES).default("front"),
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ angle, fromDate, toDate }) => {
      const all = (await getProgressPhotos(userId)).filter((p) => p.angle === angle)
      const ascending = [...all].reverse()
      const before = ascending.find((p) => !fromDate || p.localDate >= fromDate)
      const after = all.find((p) => !toDate || p.localDate <= toDate)
      if (!before || !after) {
        return text(`No ${angle} progress photos${fromDate || toDate ? " in that range" : ""}. The user can add them at /dashboard/progress.`)
      }

      const picked = before.id === after.id ? [before] : [before, after]
      const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [
        {
          type: "text",
          text: JSON.stringify(
            {
              angle,
              photos: picked.map(({ localDate, weightKg, waistCm, hipCm, notes }) => ({ localDate, weightKg, waistCm, hipCm, notes })),
              availableDates: ascending.map((p) => p.localDate),
            },
            null,
            2
          ),
        },
      ]
      for (const p of picked) {
        const photo = await db.progressPhoto.findUnique({ where: { id: p.id }, select: { pathname: true, contentType: true } })
        const data = photo && (await readPhotoBuffer(photo.pathname))
        if (data) content.push({ type: "image", data: data.toString("base64"), mimeType: photo.contentType })
      }
      return { content }
    }
  )

  return server
}
