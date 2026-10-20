import { db } from "@/lib/db"

export const PHOTO_ANGLES = ["front", "side", "back", "other"] as const
export type PhotoAngle = (typeof PHOTO_ANGLES)[number]

export interface ProgressPhotoWithStats {
  id: string
  angle: string
  localDate: string
  notes: string | null
  weightKg: number | null
  waistCm: number | null
  hipCm: number | null
}

const NEAREST_WINDOW_DAYS = 3

// Weight/waist logged within ±3 days of the photo, closest first — people
// rarely weigh in on exactly the same day they take photos.
function nearest<T extends { date: Date }>(logs: T[], localDate: string): T | null {
  const target = new Date(`${localDate}T12:00:00Z`).getTime()
  let best: T | null = null
  let bestDiff = NEAREST_WINDOW_DAYS * 86400000
  for (const log of logs) {
    const diff = Math.abs(log.date.getTime() - target)
    if (diff <= bestDiff) {
      best = log
      bestDiff = diff
    }
  }
  return best
}

export async function getProgressPhotos(userId: string): Promise<ProgressPhotoWithStats[]> {
  const photos = await db.progressPhoto.findMany({
    where: { userId },
    select: { id: true, angle: true, localDate: true, notes: true },
    orderBy: [{ localDate: "desc" }, { createdAt: "desc" }],
  })
  if (photos.length === 0) return []

  const earliest = new Date(`${photos[photos.length - 1].localDate}T00:00:00Z`)
  earliest.setUTCDate(earliest.getUTCDate() - NEAREST_WINDOW_DAYS)

  const [weights, measurements] = await Promise.all([
    db.weightLog.findMany({
      where: { userId, date: { gte: earliest } },
      select: { weightKg: true, date: true },
    }),
    db.bodyMeasurement.findMany({
      where: { userId, date: { gte: earliest }, OR: [{ waistCm: { not: null } }, { hipCm: { not: null } }] },
      select: { waistCm: true, hipCm: true, date: true },
    }),
  ])

  return photos.map((p) => {
    const measurement = nearest(measurements, p.localDate)
    return {
      ...p,
      weightKg: nearest(weights, p.localDate)?.weightKg ?? null,
      waistCm: measurement?.waistCm ?? null,
      hipCm: measurement?.hipCm ?? null,
    }
  })
}
