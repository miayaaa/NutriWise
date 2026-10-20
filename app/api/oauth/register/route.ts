import { z } from "zod"

import { db } from "@/lib/db"
import { isAllowedRedirectUri, oauthError } from "@/lib/mcp/oauth"

// RFC 7591 dynamic client registration. Registering grants nothing by itself —
// the user still has to sign in and approve on /oauth/authorize.
const bodySchema = z.object({
  client_name: z.string().max(100).optional(),
  redirect_uris: z.array(z.string().max(500)).min(1).max(10),
})

export async function POST(req: Request) {
  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch {
    return oauthError("invalid_client_metadata", "redirect_uris is required")
  }

  if (!body.redirect_uris.every(isAllowedRedirectUri)) {
    return oauthError("invalid_redirect_uri", "redirect_uris must be https (or http on localhost)")
  }

  const client = await db.oAuthClient.create({
    data: { clientName: body.client_name, redirectUris: body.redirect_uris },
  })

  return Response.json(
    {
      client_id: client.id,
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      client_name: client.clientName ?? undefined,
      redirect_uris: client.redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { status: 201 }
  )
}
