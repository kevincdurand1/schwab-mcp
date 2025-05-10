import OAuthProvider from '@cloudflare/workers-oauth-provider'
// @ts-ignore
import { McpAgent } from 'agents/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { SchwabHandler } from './schwab-handler'

// Context from the auth process, encrypted & stored in the auth token
// and provided to the MyMCP as this.props
type Props = {
  name: string
  email: string
  accessToken: string
}

export class MyMCP extends McpAgent<Props, Env> {
  server = new McpServer({
    name: 'Schwab OAuth Proxy Demo',
    version: '0.0.1',
  })

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    console.log('[MyMCP constructor] Initialized. Env:', env)
    // Props are usually injected by the OAuthProvider wrapper after auth, not at initial construction.
    // We are trying to find where they become available.
  }

  async init() {
    this.server.tool('add', { a: z.number(), b: z.number() }, async ({ a, b }) => {
      // console.log('[MyMCP tool:add] this.props:', this.props); // Linter error: Property 'props' does not exist on type 'MyMCP'
      // We need to find the correct way to access props within a tool or request handler.
      // For now, we'll just perform the addition.
      console.log('[MyMCP tool:add] Called with a:', a, 'b:', b)
      return {
        content: [{ type: 'text', text: String(a + b) }],
      }
    })
  }
}

export default new OAuthProvider({
  apiRoute: '/sse',
  // @ts-ignore
  apiHandler: MyMCP.mount('/sse') as any,
  defaultHandler: SchwabHandler as any,
  authorizeEndpoint: '/authorize',
  tokenEndpoint: '/token',
  clientRegistrationEndpoint: '/register',
})
