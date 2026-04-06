import { getServerSession } from "next-auth/next"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/workout-logs/last-performance?exercises=深蹲,RDL,臀推
// Returns { "深蹲": { weightKg: 45, sets: 4, reps: 10, date: "..." }, ... }
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response("Unauthorized", { status: 403 })

    const url = new URL(req.url)
    const exercisesParam = url.searchParams.get("exercises") ?? ""
    const exerciseNames = exercisesParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20)

    if (exerciseNames.length === 0) return Response.json({})

    const recentLogs = await db.workoutLog.findMany({
      where: { userId: session.user.id },
      select: { details: true, date: true },
      orderBy: { date: "desc" },
      take: 300,
    })

    type StrengthDetails = {
      mode: string
      strength?: { exercise: string; sets: number; reps: number; weightKg?: number }
    }

    const result: Record<string, { weightKg?: number; sets: number; reps: number; date: string }> = {}

    for (const log of recentLogs) {
      const details = log.details as StrengthDetails | null
      if (!details || details.mode !== "strength" || !details.strength) continue

      const exerciseName = details.strength.exercise
      // Match by exact name or case-insensitive
      const matchedName = exerciseNames.find(
        (n) => n === exerciseName || n.toLowerCase() === exerciseName.toLowerCase()
      )
      if (!matchedName || result[matchedName]) continue

      result[matchedName] = {
        weightKg: details.strength.weightKg,
        sets: details.strength.sets,
        reps: details.strength.reps,
        date: log.date.toISOString(),
      }

      if (Object.keys(result).length === exerciseNames.length) break
    }

    return Response.json(result)
  } catch {
    return new Response(null, { status: 500 })
  }
}
