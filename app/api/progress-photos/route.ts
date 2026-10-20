import { randomBytes } from "crypto"
import { getServerSession } from "next-auth/next"
import { z } from "zod"

import { PHOTO_ANGLES } from "@/lib/api/progress-photos"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { putPhoto } from "@/lib/storage/photos"

// The client downsizes to ~1600px JPEG before upload, so real uploads are
// a few hundred KB; this cap also stays under Vercel's 4.5 MB body limit.
const MAX_BYTES = 4 * 1024 * 1024

const fieldsSchema = z.object({
  angle: z.enum(PHOTO_ANGLES),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional(),
})

// Trust file bytes, not the client-declared MIME type.
function sniffImageType(bytes: Buffer): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png"
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp"
  return null
}

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response("Unauthorized", { status: 403 })

    const form = await req.formData()
    const file = form.get("file")
    if (!(file instanceof File)) return new Response("Missing file", { status: 422 })
    if (file.size > MAX_BYTES) return new Response("Photo too large (max 4 MB)", { status: 413 })

    const fields = fieldsSchema.parse({
      angle: form.get("angle"),
      localDate: form.get("localDate"),
      notes: (form.get("notes") as string | null) || undefined,
    })

    const bytes = Buffer.from(await file.arrayBuffer())
    const contentType = sniffImageType(bytes)
    if (!contentType) return new Response("Only JPEG, PNG or WebP images", { status: 415 })

    // Unguessable pathname, namespaced by user.
    const pathname = `progress-photos/${session.user.id}/${fields.localDate}-${randomBytes(12).toString("hex")}.${EXTENSIONS[contentType]}`
    await putPhoto(pathname, bytes, contentType)

    const photo = await db.progressPhoto.create({
      data: {
        userId: session.user.id,
        pathname,
        angle: fields.angle,
        localDate: fields.localDate,
        contentType,
        sizeBytes: bytes.length,
        notes: fields.notes,
      },
      select: { id: true, angle: true, localDate: true, notes: true },
    })
    return Response.json(photo)
  } catch (error) {
    if (error instanceof z.ZodError) return new Response(JSON.stringify(error.issues), { status: 422 })
    return new Response(null, { status: 500 })
  }
}
