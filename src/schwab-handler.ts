import type { AuthRequest, OAuthHelpers } from '@cloudflare/workers-oauth-provider'
import { Hono, Context } from 'hono'
import { clientIdAlreadyApproved, parseRedirectApproval, renderApprovalDialog } from './workers-oauth-utils'
import { auth, trader } from '@sudowealth/schwab-api'

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>()

app.get('/authorize', async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw)
  const { clientId } = oauthReqInfo
  if (!clientId) {
    console.error('[SchwabHandler /authorize GET] Invalid request: clientId is missing')
    return c.text('Invalid request', 400)
  }

  if (await clientIdAlreadyApproved(c.req.raw, oauthReqInfo.clientId, c.env.COOKIE_ENCRYPTION_KEY)) {
    return redirectToSchwab(c, oauthReqInfo)
  }

  return renderApprovalDialog(c.req.raw, {
    client: await c.env.OAUTH_PROVIDER.lookupClient(clientId),
    server: {
      name: 'Schwab OAuth Demo',
      description: 'This MCP Server is a demo for Schwab OAuth.',
    },
    state: { oauthReqInfo },
  })
})

app.post('/authorize', async (c) => {
  const { state, headers } = await parseRedirectApproval(c.req.raw, c.env.COOKIE_ENCRYPTION_KEY)
  if (!state.oauthReqInfo) {
    console.error('[SchwabHandler /authorize POST] Invalid request: state.oauthReqInfo is missing')
    return c.text('Invalid request', 400)
  }

  // console.log('[SchwabHandler /authorize POST] Redirecting to Schwab with oauthReqInfo from approval:', state.oauthReqInfo)
  return redirectToSchwab(c, state.oauthReqInfo, headers)
})

async function redirectToSchwab(c: Context, oauthReqInfo: AuthRequest, headers: Record<string, string> = {}) {
  // Schwab scopes (replace with actual required scopes)
  const schwabScope = 'SchwabApi oauth2 read'
  const location = auth.buildAuthorizeUrl({
    scope: schwabScope,
    clientId: c.env.SCHWAB_CLIENT_ID,
    redirectUri: new URL('/callback', c.req.raw.url).href,
    state: btoa(JSON.stringify(oauthReqInfo)),
  })

  return new Response(null, {
    status: 302,
    headers: {
      ...headers,
      location: location,
    },
  })
}

/**
 * OAuth Callback Endpoint
 *
 * This route handles the callback from Schwab after user authentication.
 * It exchanges the temporary code for an access token, then stores some
 * user metadata & the auth token as part of the 'props' on the token passed
 * down to the client. It ends by redirecting the client back to _its_ callback URL
 */
app.get('/callback', async (c) => {
  // Get the oathReqInfo out of state
  const oauthReqInfo = JSON.parse(atob(c.req.query('state') as string)) as AuthRequest
  if (!oauthReqInfo.clientId) {
    return c.text('Invalid state', 400)
  }

  // Exchange the code for an access token
  const code = c.req.query('code')
  if (!code) {
    return c.text('Missing code', 400)
  }

  // Schwab OAuth 2.0 token endpoint (replace with actual endpoint if different)
  const redirectUriFromCallback = new URL('/callback', c.req.url).href // Renamed to avoid conflict
  let schwabTokenResponse

  try {
    schwabTokenResponse = await auth.exchangeCodeForToken({
      clientId: c.env.SCHWAB_CLIENT_ID,
      clientSecret: c.env.SCHWAB_CLIENT_SECRET,
      code: code as string, // Ensure 'code' is not undefined here
      redirectUri: redirectUriFromCallback, // Use the renamed variable
    })
  } catch (error: any) {
    console.error('[SchwabHandler /callback] Token exchange failed:', error)

    // Generic error for other cases
    return c.text('Failed to exchange authorization code for token.', 500)
  }

  const accessToken = schwabTokenResponse.access_token

  // Fetch the user info from Schwab
  try {
    const userPreferenceData = await trader.userPreference.getUserPreference(accessToken)

    // Extract data based on the (now inferred) UserPreference schema
    let userIdFromSchwab: string
    let userNameFromSchwab: string = 'Schwab User' // Default name

    if (userPreferenceData?.streamerInfo?.[0]?.schwabClientCorrelId) {
      userIdFromSchwab = userPreferenceData.streamerInfo[0].schwabClientCorrelId

      userNameFromSchwab = `User ${userIdFromSchwab.substring(0, 8)}`
    } else {
      // Fallback if schwabClientCorrelId is not available - this is less ideal
      console.warn(
        '[SchwabHandler /callback] Relevant user identifier (e.g., streamerInfo[0].schwabClientCorrelId) not found in UserPreference. Falling back to a temporary ID.',
      )
      userIdFromSchwab = `schwabUser_${Date.now()}`
    }

    // Return back to the MCP client a new token
    const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
      request: oauthReqInfo,
      userId: userIdFromSchwab, // Use the extracted/placeholder ID
      metadata: {
        label: userNameFromSchwab, // Use the extracted/placeholder name
      },
      scope: oauthReqInfo.scope,
      props: {
        name: userNameFromSchwab, // Use the extracted/placeholder name
        accessToken, // The Schwab access token
      },
    })

    return Response.redirect(redirectTo)
  } catch (error) {
    console.error(`[SchwabHandler /callback] Failed to fetch user preferences:`, error)
    return c.text(`Failed to fetch user preferences: ${error instanceof Error ? error.message : String(error)}`, 500)
  }
})

export { app as SchwabHandler }
