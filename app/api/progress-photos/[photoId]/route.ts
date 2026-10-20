import { getServerSession } from "next-auth/next"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { deletePhoto, readPhoto } from "@/lib/storage/photos"

interface RouteContext {
  params: { photoId: string }
}

// Streams the private image. Auth is checked here, right next to the read —
// never cache in the CDN (no s-maxage) so one user's photo can't leak to another.
export async function GET(req: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return new Response("Unauthorized", { status: 403 })

  const photo = await db.progressPhoto.findFirst({
    where: { id: params.photoId, userId: session.user.id },
    select: { pathname: true, contentType: true },
  })
  if (!photo) return new Response("Not found", { status: 404 })

  const result = await readPhoto(photo.pathname, req.headers.get("if-none-match") ?? undefined)
  const headers: Record<string, string> = { "Cache-Control": "private, no-cache" }

  if (result.status === 404) return new Response("Not found", { status: 404 })
  if (result.status === 304) return new Response(null, { status: 304, headers: { ...headers, ETag: result.etag } })

  return new Response(result.stream, {
    headers: {
      ...headers,
      "Content-Type": photo.contentType,
      "X-Content-Type-Options": "nosniff",
      ...(result.etag ? { ETag: result.etag } : {}),
    },
  })
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response("Unauthorized", { status: 403 })

    const photo = await db.progressPhoto.findFirst({
      where: { id: params.photoId, userId: session.user.id },
      select: { id: true, pathname: true },
    })
    if (!photo) return new Response("Not found", { status: 404 })

    await deletePhoto(photo.pathname)
    await db.progressPhoto.delete({ where: { id: photo.id } })
    return new Response(null, { status: 204 })
  } catch {
    return new Response(null, { status: 500 })
  }
}
