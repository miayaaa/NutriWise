import { getServerSession } from "next-auth/next"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response("Unauthorized", { status: 403 })

    const log = await db.bodyMeasurement.findUnique({ where: { id: params.id } })
    if (!log || log.userId !== session.user.id) return new Response(null, { status: 404 })

    await db.bodyMeasurement.delete({ where: { id: params.id } })
    return new Response(null, { status: 204 })
  } catch {
    return new Response(null, { status: 500 })
  }
}
