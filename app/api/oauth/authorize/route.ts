import { getServerSession } from "next-auth/next"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  AUTH_CODE_TTL_SEC,
  getOrigin,
  randomToken,
  sha256,
  validateAuthorizeRequest,
} from "@/lib/mcp/oauth"

// Consent form target. Re-validates everything from the form, then redirects
// back to the client with a one-time code (or access_denied).
export async function POST(req: Request) {
  // The session cookie is SameSite=Lax so cross-site POSTs arrive without it,
  // but reject foreign origins explicitly as well.
  const origin = req.headers.get("origin")
  if (origin && origin !== getOrigin(req)) {
    return new Response("Forbidden", { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user) return new Response("Unauthorized", { status: 403 })

  const form = await req.formData()
  const params: Record<string, string> = {}
  form.forEach((value, key) => {
    if (typeof value === "string") params[key] = value
  })

  const result = await validateAuthorizeRequest(params)
  if (!result.ok) return new Response(result.error, { status: 400 })
  const { clientId, redirectUri, codeChallenge, state, resource } = result.value

  const target = new URL(redirectUri)
  if (state) target.searchParams.set("state", state)

  if (params.decision !== "allow") {
    target.searchParams.set("error", "access_denied")
    return Response.redirect(target.toString(), 303)
  }

  const code = randomToken()
  await db.oAuthCode.create({
    data: {
      codeHash: sha256(code),
      clientId,
      userId: session.user.id,
      redirectUri,
      codeChallenge,
      resource,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_SEC * 1000),
    },
  })

  target.searchParams.set("code", code)
  return Response.redirect(target.toString(), 303)
}
