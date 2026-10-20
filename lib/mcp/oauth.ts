import { createHash, randomBytes } from "crypto"

import { db } from "@/lib/db"

// Minimal OAuth 2.1 authorization server so the Claude app can connect to
// /api/mcp as a custom connector. Public clients only (PKCE S256 required).

export const ACCESS_TOKEN_TTL_SEC = 60 * 60 // 1h
export const REFRESH_TOKEN_TTL_SEC = 60 * 60 * 24 * 30 // 30d
export const AUTH_CODE_TTL_SEC = 60 * 5 // 5min
export const MCP_SCOPE = "nutriwise"

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

export function randomToken(): string {
  return randomBytes(32).toString("base64url")
}

export function getOrigin(req: Request): string {
  return new URL(req.url).origin
}

export function getMcpResourceUrl(origin: string): string {
  return `${origin}/api/mcp`
}

// https anywhere, or plain http only for local development clients.
export function isAllowedRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri)
    if (url.hash) return false
    if (url.protocol === "https:") return true
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  } catch {
    return false
  }
}

export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)) return false
  return createHash("sha256").update(codeVerifier).digest("base64url") === codeChallenge
}

export async function issueTokens(clientId: string, userId: string) {
  const accessToken = randomToken()
  const refreshToken = randomToken()
  const now = Date.now()

  await db.oAuthToken.create({
    data: {
      accessTokenHash: sha256(accessToken),
      refreshTokenHash: sha256(refreshToken),
      clientId,
      userId,
      accessExpiresAt: new Date(now + ACCESS_TOKEN_TTL_SEC * 1000),
      refreshExpiresAt: new Date(now + REFRESH_TOKEN_TTL_SEC * 1000),
    },
  })

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SEC,
    refresh_token: refreshToken,
    scope: MCP_SCOPE,
  }
}

/** Returns the userId for a valid, unexpired bearer token, else null. */
export async function verifyBearerToken(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization")
  const match = header?.match(/^Bearer\s+(.+)$/i)
  if (!match) return null

  const token = await db.oAuthToken.findUnique({
    where: { accessTokenHash: sha256(match[1].trim()) },
    select: { userId: true, accessExpiresAt: true },
  })
  if (!token || token.accessExpiresAt < new Date()) return null
  return token.userId
}

export function oauthError(error: string, description: string, status = 400) {
  return Response.json(
    { error, error_description: description },
    { status, headers: { "Cache-Control": "no-store" } }
  )
}

export interface AuthorizeParams {
  clientId: string
  clientName: string | null
  redirectUri: string
  codeChallenge: string
  state: string | null
  resource: string | null
}

/**
 * Validates an authorization request. Used by both the consent page and the
 * decision endpoint, since the form's hidden fields can't be trusted.
 * Errors here are shown on-page, never redirected (redirect_uri may be bogus).
 */
export async function validateAuthorizeRequest(
  params: Record<string, string | undefined>
): Promise<{ ok: true; value: AuthorizeParams } | { ok: false; error: string }> {
  const { client_id, redirect_uri, response_type, code_challenge, code_challenge_method } = params
  if (!client_id || !redirect_uri) return { ok: false, error: "Missing client_id or redirect_uri." }

  const client = await db.oAuthClient.findUnique({ where: { id: client_id } })
  if (!client) return { ok: false, error: "Unknown client." }
  if (!client.redirectUris.includes(redirect_uri)) {
    return { ok: false, error: "redirect_uri is not registered for this client." }
  }
  if (response_type !== "code") return { ok: false, error: "response_type must be 'code'." }
  if (!code_challenge || code_challenge_method !== "S256") {
    return { ok: false, error: "PKCE with S256 is required." }
  }

  return {
    ok: true,
    value: {
      clientId: client.id,
      clientName: client.clientName,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
      state: params.state ?? null,
      resource: params.resource ?? null,
    },
  }
}
