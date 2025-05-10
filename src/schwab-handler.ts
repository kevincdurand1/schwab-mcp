import type { AuthRequest, OAuthHelpers } from '@cloudflare/workers-oauth-provider'
import { Hono, Context } from 'hono'
import { fetchUpstreamAuthToken, getUpstreamAuthorizeUrl, Props } from './utils'
import { clientIdAlreadyApproved, parseRedirectApproval, renderApprovalDialog } from './workers-oauth-utils'

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>()

app.get('/authorize', async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw)
  // console.log('[SchwabHandler /authorize GET] Parsed oauthReqInfo:', oauthReqInfo)
  const { clientId } = oauthReqInfo
  if (!clientId) {
    console.error('[SchwabHandler /authorize GET] Invalid request: clientId is missing')
    return c.text('Invalid request', 400)
  }

  if (await clientIdAlreadyApproved(c.req.raw, oauthReqInfo.clientId, c.env.COOKIE_ENCRYPTION_KEY)) {
    // console.log('[SchwabHandler /authorize GET] Client ID already approved, redirecting to Schwab.')
    return redirectToSchwab(c, oauthReqInfo)
  }

  // console.log('[SchwabHandler /authorize GET] Client ID not approved, rendering approval dialog.')
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
  // console.log('[SchwabHandler /authorize POST] Parsed approval state:', state)
  if (!state.oauthReqInfo) {
    console.error('[SchwabHandler /authorize POST] Invalid request: state.oauthReqInfo is missing')
    return c.text('Invalid request', 400)
  }

  // console.log('[SchwabHandler /authorize POST] Redirecting to Schwab with oauthReqInfo from approval:', state.oauthReqInfo)
  return redirectToSchwab(c, state.oauthReqInfo, headers)
})

async function redirectToSchwab(c: Context, oauthReqInfo: AuthRequest, headers: Record<string, string> = {}) {
  // console.log('[SchwabHandler redirectToSchwab] Called with oauthReqInfo:', oauthReqInfo, 'and headers:', headers)
  // Schwab OAuth 2.0 authorize endpoint (replace with actual endpoint if different)
  const schwabAuthorizeUrl = 'https://api.schwabapi.com/v1/oauth/authorize'
  // Schwab scopes (replace with actual required scopes)
  const schwabScope = 'SchwabApi oauth2 read'

  const location = getUpstreamAuthorizeUrl({
    upstreamUrl: schwabAuthorizeUrl,
    scope: schwabScope,
    clientId: c.env.SCHWAB_CLIENT_ID, // Add SCHWAB_CLIENT_ID to your environment
    redirectUri: new URL('/callback', c.req.raw.url).href,
    state: btoa(JSON.stringify(oauthReqInfo)),
    // Schwab does not use hostedDomain
  })
  // console.log('[SchwabHandler redirectToSchwab] Redirecting to location:', location)

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
  const schwabTokenUrl = 'https://api.schwabapi.com/v1/oauth/token'

  const [accessToken, schwabErrResponse] = await fetchUpstreamAuthToken({
    upstreamUrl: schwabTokenUrl,
    clientId: c.env.SCHWAB_CLIENT_ID, // Add SCHWAB_CLIENT_ID to your environment
    clientSecret: c.env.SCHWAB_CLIENT_SECRET, // Add SCHWAB_CLIENT_SECRET to your environment
    code,
    redirectUri: new URL('/callback', c.req.url).href,
    grantType: 'authorization_code',
  })
  if (schwabErrResponse) {
    return schwabErrResponse
  }

  // Fetch the user info from Schwab
  const schwabUserPreferenceUrl = 'https://api.schwabapi.com/trader/v1/userPreference'
  // console.log(`[SchwabHandler /callback] Fetching user preferences from: ${schwabUserPreferenceUrl}`)
  const userResponse = await fetch(schwabUserPreferenceUrl, {
    // Use the new URL
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!userResponse.ok) {
    const errorText = await userResponse.text()
    console.error(`[SchwabHandler /callback] Failed to fetch user preferences. Status: ${userResponse.status}, Body: ${errorText}`)
    return c.text(`Failed to fetch user preferences: ${errorText}`, 500)
  }

  const userPreferenceData: any = await userResponse.json() // Explicitly type as any for now
  // console.log('[SchwabHandler /callback] Received user preference data:', JSON.stringify(userPreferenceData, null, 2)) // Keep this commented for future debugging

  // Extract data based on the provided UserPreference schema
  let userIdFromSchwab: string
  let userNameFromSchwab: string = 'Schwab User' // Default name
  const userEmailFromSchwab: string = '' // Email is not in the schema

  if (userPreferenceData?.streamerInfo?.schwabClientCustomerId) {
    userIdFromSchwab = userPreferenceData.streamerInfo.schwabClientCustomerId
  } else {
    // Fallback if schwabClientCustomerId is not available - this is less ideal
    console.warn(
      '[SchwabHandler /callback] streamerInfo.schwabClientCustomerId not found in UserPreference. Falling back to a temporary ID.',
    )
    userIdFromSchwab = `schwabUser_${Date.now()}`
  }

  if (userPreferenceData?.accounts && Array.isArray(userPreferenceData.accounts)) {
    const primaryAccount = userPreferenceData.accounts.find((acc: any) => acc.primaryAccount === true)
    if (primaryAccount && primaryAccount.nickName) {
      userNameFromSchwab = primaryAccount.nickName
    } else if (userPreferenceData.accounts.length > 0 && userPreferenceData.accounts[0].nickName) {
      // Fallback to the first account's nickname if no primary or primary has no nickname
      userNameFromSchwab = userPreferenceData.accounts[0].nickName
    }
  }

  // console.log(
  //   `[SchwabHandler /callback] Using for MCP: userId='${userIdFromSchwab}', userName='${userNameFromSchwab}', email='${userEmailFromSchwab}'`,
  // ) // Keep this commented for future debugging

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
      email: userEmailFromSchwab, // Use the extracted/placeholder email
      accessToken, // The Schwab access token
    } as Props,
  })

  return Response.redirect(redirectTo)
})

export { app as SchwabHandler }
