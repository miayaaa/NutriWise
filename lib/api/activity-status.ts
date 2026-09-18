import { db } from "@/lib/db"

export interface SedentaryStatus {
  sedentaryHours: number | null
  hasLoggedWorkoutToday: boolean
  isSedentaryAlert: boolean
}

const SEDENTARY_THRESHOLD_HOURS = 3

/**
 * Approximates "time since last movement today" from logged data. This is a
 * best-effort proxy, not real sensor-based sedentary detection — a pure web
 * app has no access to background accelerometer/step data.
 *
 * Important nuance: WorkoutLog.date is a real timestamp, but ActivityLog.date
 * (used for Steps and other generic activities) is a day-bucket key set to
 * local midnight, not the actual time of day the entry was made — see
 * quick-log-button.tsx and the activities/[activityId]/logs route. So when
 * only an ActivityLog exists for today, we know movement happened but not
 * when, and sedentaryHours is left null rather than computed from a
 * misleading midnight timestamp.
 */
export async function getSedentaryStatus(userId: string): Promise<SedentaryStatus> {
  const now = new Date()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const [lastWorkoutToday, activityLoggedToday] = await Promise.all([
    db.workoutLog.findFirst({
      where: { userId, date: { gte: todayStart, lte: todayEnd } },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
    db.activityLog.findFirst({
      where: { activity: { userId }, date: { gte: todayStart, lte: todayEnd }, count: { gt: 0 } },
      select: { id: true },
    }),
  ])

  const hasLoggedWorkoutToday = lastWorkoutToday != null || activityLoggedToday != null

  let sedentaryHours: number | null
  if (lastWorkoutToday) {
    sedentaryHours = (now.getTime() - lastWorkoutToday.date.getTime()) / (1000 * 60 * 60)
  } else if (activityLoggedToday) {
    sedentaryHours = null
  } else {
    sedentaryHours = (now.getTime() - todayStart.getTime()) / (1000 * 60 * 60)
  }

  return {
    sedentaryHours,
    hasLoggedWorkoutToday,
    isSedentaryAlert:
      !hasLoggedWorkoutToday &&
      sedentaryHours != null &&
      sedentaryHours >= SEDENTARY_THRESHOLD_HOURS,
  }
}
