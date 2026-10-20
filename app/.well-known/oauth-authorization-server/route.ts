import { getOrigin, MCP_SCOPE } from "@/lib/mcp/oauth"

// RFC 8414 — authorization server metadata for the MCP connector.
export function GET(req: Request) {
  const origin = getOrigin(req)
  return Response.json({
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    scopes_supported: [MCP_SCOPE],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  })
}
