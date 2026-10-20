"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import type { ProgressPhotoWithStats } from "@/lib/api/progress-photos"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"

const ANGLES = [
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
  { value: "back", label: "Back" },
  { value: "other", label: "Other" },
] as const

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.85

function pad(n: number) { return String(n).padStart(2, "0") }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function formatDate(localDate: string) {
  return new Date(`${localDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// Downscale + re-encode as JPEG in the browser: keeps uploads ~300-500 KB,
// strips EXIF (incl. GPS location) and normalises iPhone HEIC to JPEG.
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), "image/jpeg", JPEG_QUALITY)
  )
}

function Delta({ before, after, unit }: { before: number | null; after: number | null; unit: string }) {
  if (before == null || after == null) return null
  const diff = Math.round((after - before) * 10) / 10
  return (
    <span className={cn("font-medium", diff < 0 ? "text-emerald-600" : diff > 0 ? "text-orange-600" : "text-muted-foreground")}>
      {diff > 0 ? "+" : ""}{diff} {unit}
    </span>
  )
}

function PhotoStats({ photo }: { photo: ProgressPhotoWithStats }) {
  const parts = [
    photo.weightKg != null ? `${photo.weightKg} kg` : null,
    photo.waistCm != null ? `waist ${photo.waistCm} cm` : null,
  ].filter(Boolean)
  return <p className="text-xs text-muted-foreground">{parts.length ? parts.join(" · ") : "No weight/waist logged that week"}</p>
}

function PhotoImage({ photo, className }: { photo: ProgressPhotoWithStats; className?: string }) {
  return (
    // Private, auth-checked route — next/image's optimizer can't fetch it with the user's session.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/progress-photos/${photo.id}`}
      alt={`${photo.angle} progress photo, ${formatDate(photo.localDate)}`}
      loading="lazy"
      className={cn("w-full rounded-md bg-muted object-cover", className)}
    />
  )
}

interface ProgressPhotosProps {
  photos: ProgressPhotoWithStats[]
}

export function ProgressPhotos({ photos }: ProgressPhotosProps) {
  const router = useRouter()
  const fileInput = React.useRef<HTMLInputElement>(null)
  const [angle, setAngle] = React.useState<(typeof ANGLES)[number]["value"]>("front")
  const [localDate, setLocalDate] = React.useState(() => toDateStr(new Date()))
  const [isUploading, setIsUploading] = React.useState(false)
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null)

  // ── Compare ────────────────────────────────────────────────
  const [compareAngle, setCompareAngle] = React.useState<string>("front")
  const angleDates = Array.from(
    new Set(photos.filter((p) => p.angle === compareAngle).map((p) => p.localDate))
  ).sort()
  const [fromDate, setFromDate] = React.useState<string | null>(null)
  const [toDate, setToDate] = React.useState<string | null>(null)
  const from = fromDate && angleDates.includes(fromDate) ? fromDate : angleDates[0]
  const to = toDate && angleDates.includes(toDate) ? toDate : angleDates[angleDates.length - 1]
  const pick = (date?: string) => photos.find((p) => p.angle === compareAngle && p.localDate === date)
  const before = pick(from)
  const after = pick(to)

  // ── Gallery grouped by date (newest first) ─────────────────
  const byDate = new Map<string, ProgressPhotoWithStats[]>()
  for (const p of photos) byDate.set(p.localDate, [...(byDate.get(p.localDate) ?? []), p])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || isUploading) return
    setIsUploading(true)
    try {
      const compressed = await compressImage(file)
      const form = new FormData()
      form.append("file", compressed, "photo.jpg")
      form.append("angle", angle)
      form.append("localDate", localDate)
      const res = await fetch("/api/progress-photos", { method: "POST", body: form })
      if (!res.ok) throw new Error(await res.text())
      toast({ description: `${ANGLES.find((a) => a.value === angle)?.label} photo saved` })
      router.refresh()
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error && err.message ? err.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (pendingDelete !== id) {
      setPendingDelete(id)
      return
    }
    setPendingDelete(null)
    const res = await fetch(`/api/progress-photos/${id}`, { method: "DELETE" })
    if (!res.ok) {
      toast({ description: "Could not delete photo", variant: "destructive" })
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add photo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {ANGLES.map((a) => (
              <Button
                key={a.value}
                type="button"
                size="sm"
                variant={angle === a.value ? "default" : "outline"}
                onClick={() => setAngle(a.value)}
              >
                {a.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              type="date"
              value={localDate}
              max={toDateStr(new Date())}
              onChange={(e) => setLocalDate(e.target.value)}
              className="w-auto"
              aria-label="Photo date"
            />
            <Button type="button" className="flex-1" disabled={isUploading} onClick={() => fileInput.current?.click()}>
              {isUploading ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.add className="mr-2 h-4 w-4" />}
              {isUploading ? "Uploading…" : "Choose photo"}
            </Button>
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
          <p className="text-xs text-muted-foreground">
            Same spot, lighting and time of day each week makes comparisons meaningful. Photos are private to your account; location data is removed before upload.
          </p>
        </CardContent>
      </Card>

      {photos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Compare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {ANGLES.filter((a) => photos.some((p) => p.angle === a.value)).map((a) => (
                <Button
                  key={a.value}
                  type="button"
                  size="sm"
                  variant={compareAngle === a.value ? "default" : "outline"}
                  onClick={() => setCompareAngle(a.value)}
                >
                  {a.label}
                </Button>
              ))}
            </div>

            {angleDates.length < 2 ? (
              <p className="text-sm text-muted-foreground">
                Add {compareAngle} photos on at least two different days to compare.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Before", value: from, set: setFromDate, photo: before },
                    { label: "After", value: to, set: setToDate, photo: after },
                  ].map((side) => (
                    <div key={side.label} className="space-y-2">
                      <select
                        value={side.value}
                        onChange={(e) => side.set(e.target.value)}
                        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                        aria-label={`${side.label} date`}
                      >
                        {angleDates.map((d) => (
                          <option key={d} value={d}>{formatDate(d)}</option>
                        ))}
                      </select>
                      {side.photo && (
                        <>
                          <PhotoImage photo={side.photo} className="aspect-[3/4]" />
                          <PhotoStats photo={side.photo} />
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {before && after && (
                  <p className="text-sm">
                    {Math.round((new Date(to!).getTime() - new Date(from!).getTime()) / 86400000)} days:{" "}
                    <Delta before={before.weightKg} after={after.weightKg} unit="kg" />
                    {before.weightKg != null && after.weightKg != null && before.waistCm != null && after.waistCm != null && " · "}
                    <Delta before={before.waistCm} after={after.waistCm} unit="cm waist" />
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {Array.from(byDate.entries()).map(([date, items]) => (
          <div key={date} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">{formatDate(date)}</h3>
              <PhotoStats photo={items[0]} />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {items.map((p) => (
                <div key={p.id} className="relative">
                  <PhotoImage photo={p} className="aspect-[3/4]" />
                  <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] capitalize text-white">
                    {p.angle}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    onBlur={() => setPendingDelete((cur) => (cur === p.id ? null : cur))}
                    className={cn(
                      "absolute right-1 top-1 rounded px-1.5 py-0.5 text-[10px] text-white",
                      pendingDelete === p.id ? "bg-red-600" : "bg-black/60"
                    )}
                    aria-label={pendingDelete === p.id ? "Confirm delete" : "Delete photo"}
                  >
                    {pendingDelete === p.id ? "Delete?" : <Icons.trash className="h-3 w-3" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {photos.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No progress photos yet. Take your first front, side and back photos to start tracking.
          </p>
        )}
      </div>
    </div>
  )
}
