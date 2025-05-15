import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { DurableMCP } from 'workers-mcp'
import { SchwabHandler } from './schwab-handler'
import { registerAccountTools } from './tools/accounts'
import { registerOrderTools } from './tools/orders'
import { registerTransactionTools } from './tools/transactions'

type Props = {
	name: string
	email: string
	accessToken: string
}

export class MyMCP extends DurableMCP<Props, Env> {
	server = new McpServer({
		name: 'Schwab MCP',
		version: '0.0.1',
	})

	async init() {
		const getAccessToken = () => this.props.accessToken

		registerAccountTools(this.server, getAccessToken)
		registerOrderTools(this.server, getAccessToken)
		registerTransactionTools(this.server, getAccessToken)
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
