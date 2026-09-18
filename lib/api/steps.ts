import { db } from "@/lib/db"

const STEPS_ACTIVITY_NAME = "Steps"
const STEPS_ACTIVITY_COLOR = "#0EA5E9"

// Steps activity is auto-provisioned per user so step counts can reuse the
// existing Activity/ActivityLog model instead of a dedicated table.
export async function getOrCreateStepsActivity(userId: string) {
  const existing = await db.activity.findFirst({
    where: { userId, name: STEPS_ACTIVITY_NAME },
    select: { id: true },
  })
  if (existing) return existing

  return db.activity.create({
    data: {
      userId,
      name: STEPS_ACTIVITY_NAME,
      description: "Daily step count",
      colorCode: STEPS_ACTIVITY_COLOR,
    },
    select: { id: true },
  })
}

/**
 * Step counters report a running daily total, not an incremental delta —
 * re-uploading a later screenshot from the same day should REPLACE the
 * day's count, unlike generic ActivityLog entries which accumulate.
 */
export async function upsertStepsLog(userId: string, date: Date, steps: number) {
  const activity = await getOrCreateStepsActivity(userId)

  const existingLog = await db.activityLog.findFirst({
    where: { activityId: activity.id, date },
    select: { id: true },
  })

  if (existingLog) {
    return db.activityLog.update({
      where: { id: existingLog.id },
      data: { count: steps },
      select: { id: true, count: true },
    })
  }

  return db.activityLog.create({
    data: { activityId: activity.id, date, count: steps },
    select: { id: true, count: true },
  })
}

export async function getTodayStepCount(userId: string, date: Date): Promise<number | null> {
  const activity = await db.activity.findFirst({
    where: { userId, name: STEPS_ACTIVITY_NAME },
    select: { id: true },
  })
  if (!activity) return null

  const log = await db.activityLog.findFirst({
    where: { activityId: activity.id, date },
    select: { count: true },
  })
  return log?.count ?? null
}
