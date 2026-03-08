import { getServerSession } from "next-auth/next"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(
  _req: Request,
  { params }: { params: { logId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new Response("Unauthorized", { status: 403 })

    const log = await db.weightLog.findUnique({ where: { id: params.logId } })
    if (!log || log.userId !== session.user.id) return new Response(null, { status: 404 })

    await db.weightLog.delete({ where: { id: params.logId } })
    return new Response(null, { status: 204 })
  } catch {
    return new Response(null, { status: 500 })
  }
}
