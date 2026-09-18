import { getServerSession } from "next-auth/next"

import { authOptions } from "@/lib/auth"
import { getSedentaryStatus } from "@/lib/api/activity-status"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return new Response("Unauthorized", { status: 403 })

  const status = await getSedentaryStatus(session.user.id)
  return Response.json(status)
}
