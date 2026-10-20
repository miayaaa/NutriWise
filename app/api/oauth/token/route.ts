import { db } from "@/lib/db"
import { issueTokens, oauthError, sha256, verifyPkce } from "@/lib/mcp/oauth"

async function readParams(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    const json = (await req.json()) as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(json).filter((e): e is [string, string] => typeof e[1] === "string")
    )
  }
  return Object.fromEntries(new URLSearchParams(await req.text()))
}

export async function POST(req: Request) {
  let params: Record<string, string>
  try {
    params = await readParams(req)
  } catch {
    return oauthError("invalid_request", "Malformed request body")
  }

  if (params.grant_type === "authorization_code") {
    const { code, code_verifier, client_id, redirect_uri } = params
    if (!code || !code_verifier || !client_id || !redirect_uri) {
      return oauthError("invalid_request", "code, code_verifier, client_id and redirect_uri are required")
    }

    // Single use: delete first so a replayed code can never succeed twice.
    const stored = await db.oAuthCode.delete({ where: { codeHash: sha256(code) } }).catch(() => null)
    if (
      !stored ||
      stored.expiresAt < new Date() ||
      stored.clientId !== client_id ||
      stored.redirectUri !== redirect_uri ||
      !verifyPkce(code_verifier, stored.codeChallenge)
    ) {
      return oauthError("invalid_grant", "Invalid or expired authorization code")
    }

    return Response.json(await issueTokens(stored.clientId, stored.userId), {
      headers: { "Cache-Control": "no-store" },
    })
  }

  if (params.grant_type === "refresh_token") {
    const { refresh_token, client_id } = params
    if (!refresh_token || !client_id) {
      return oauthError("invalid_request", "refresh_token and client_id are required")
    }

    // Rotate: the old refresh token is consumed whether or not it's still valid.
    const stored = await db.oAuthToken
      .delete({ where: { refreshTokenHash: sha256(refresh_token) } })
      .catch(() => null)
    if (!stored || stored.refreshExpiresAt < new Date() || stored.clientId !== client_id) {
      return oauthError("invalid_grant", "Invalid or expired refresh token")
    }

    return Response.json(await issueTokens(stored.clientId, stored.userId), {
      headers: { "Cache-Control": "no-store" },
    })
  }

  return oauthError("unsupported_grant_type", "Use authorization_code or refresh_token")
}
