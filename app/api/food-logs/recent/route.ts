import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return new Response("Unauthorized", { status: 403 })

  // Return last 8 unique food descriptions with their macros
  const logs = await db.foodLog.findMany({
    where: { userId: session.user.id },
    select: {
      foodDescription: true,
      mealType: true,
      aiCalories: true,
      protein: true,
      carbs: true,
      fat: true,
      aiComment: true,
    },
    orderBy: { date: "desc" },
    take: 40, // scan recent 40 to find 8 unique descriptions
  })

  // Deduplicate by foodDescription, keep first occurrence (most recent)
  const seen = new Set<string>()
  const unique = logs.filter((l) => {
    if (!l.foodDescription || seen.has(l.foodDescription)) return false
    seen.add(l.foodDescription)
    return true
  }).slice(0, 8)

  return Response.json(unique)
}
