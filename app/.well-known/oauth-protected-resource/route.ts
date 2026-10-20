import { getMcpResourceUrl, getOrigin, MCP_SCOPE } from "@/lib/mcp/oauth"

// RFC 9728 — tells MCP clients which authorization server protects /api/mcp.
export function GET(req: Request) {
  const origin = getOrigin(req)
  return Response.json({
    resource: getMcpResourceUrl(origin),
    authorization_servers: [origin],
    scopes_supported: [MCP_SCOPE],
    bearer_methods_supported: ["header"],
  })
}
