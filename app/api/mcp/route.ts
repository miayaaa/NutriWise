import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"

import { getOrigin, verifyBearerToken } from "@/lib/mcp/oauth"
import { createNutriWiseMcpServer } from "@/lib/mcp/server"

// Remote MCP endpoint for the Claude app (custom connector). Stateless:
// a fresh server + transport per request, authenticated by OAuth bearer token.
export const dynamic = "force-dynamic"

async function handle(req: Request) {
  const userId = await verifyBearerToken(req)
  if (!userId) {
    const metadataUrl = `${getOrigin(req)}/.well-known/oauth-protected-resource`
    return new Response(JSON.stringify({ error: "invalid_token" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer resource_metadata="${metadataUrl}"`,
      },
    })
  }

  const server = createNutriWiseMcpServer(userId)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  await server.connect(transport)
  return transport.handleRequest(req)
}

export { handle as GET, handle as POST, handle as DELETE }
