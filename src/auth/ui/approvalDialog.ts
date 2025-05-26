import { type ClientInfo } from '@cloudflare/workers-oauth-provider'
import { logger } from '../../shared/logger'
import { defaultRedirectValidator } from '../redirectValidator'

// CSS for the approval dialog
const APPROVAL_CSS = `
/* Modern, responsive styling with system fonts */
:root {
  --primary-color: #0070f3;
  --error-color: #f44336;
  --border-color: #e5e7eb;
  --text-color: #333;
  --background-color: #fff;
  --card-shadow: 0 8px 36px 8px rgba(0, 0, 0, 0.1);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
               Helvetica, Arial, sans-serif, "Apple Color Emoji", 
               "Segoe UI Emoji", "Segoe UI Symbol";
  line-height: 1.6;
  color: var(--text-color);
  background-color: #f9fafb;
  margin: 0;
  padding: 0;
}

.container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 1rem;
}

.precard {
  padding: 2rem;
  text-align: center;
}

.card {
  background-color: var(--background-color);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  padding: 2rem;
}

.header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.logo {
  width: 48px;
  height: 48px;
  margin-right: 1rem;
  border-radius: 8px;
  object-fit: contain;
}

.title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 400;
}

.alert {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 400;
  margin: 1rem 0;
  text-align: center;
}

.description {
  color: #555;
}

.client-info {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 1rem 1rem 0.5rem;
  margin-bottom: 1.5rem;
}

.client-name {
  font-weight: 600;
  font-size: 1.2rem;
  margin: 0 0 0.5rem 0;
}

.client-detail {
  display: flex;
  margin-bottom: 0.5rem;
  align-items: baseline;
}

.detail-label {
  font-weight: 500;
  min-width: 120px;
}

.detail-value {
  font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  word-break: break-all;
}

.detail-value a {
  color: inherit;
  text-decoration: underline;
}

.detail-value.small {
  font-size: 0.8em;
}

.external-link-icon {
  font-size: 0.75em;
  margin-left: 0.25rem;
  vertical-align: super;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.button {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  font-size: 1rem;
}

.button-primary {
  background-color: var(--primary-color);
  color: white;
}

.button-secondary {
  background-color: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-color);
}

.warning {
  background-color: #fff3e0;
  border: 1px solid #ff9800;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  color: #e65100;
}

.warning-icon {
  display: inline-block;
  margin-right: 0.5rem;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .container {
    margin: 1rem auto;
    padding: 0.5rem;
  }
  
  .card {
    padding: 1.5rem;
  }
  
  .client-detail {
    flex-direction: column;
  }
  
  .detail-label {
    min-width: unset;
    margin-bottom: 0.25rem;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .button {
    width: 100%;
  }
}
`

/**
 * Configuration for the approval dialog
 */
interface ApprovalDialogOptions {
	/**
	 * Client information to display in the approval dialog
	 */
	client: ClientInfo | null
	/**
	 * Server information to display in the approval dialog
	 */
	server: {
		name: string
		logo?: string
		description?: string
	}
	/**
	 * Arbitrary state data to pass through the approval flow
	 * Will be encoded in the form and returned when approval is complete
	 */
	state: Record<string, any>
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param unsafe - The unsafe string that might contain HTML
 * @returns A safe string with HTML special characters escaped
 */
function sanitizeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')
}

/**
 * Renders an approval dialog for OAuth authorization
 * The dialog displays information about the client and server
 * and includes a form to submit approval
 *
 * @param request - The HTTP request
 * @param options - Configuration for the approval dialog
 * @returns A Response containing the HTML approval dialog
 */
export function renderApprovalDialog(
	request: Request,
	options: ApprovalDialogOptions,
): Response {
	const { client, server, state } = options

	// Encode state for form submission
	const encodedState = btoa(JSON.stringify(state))

	// Sanitize any untrusted content
	const serverName = sanitizeHtml(server.name)
	const clientName = client?.clientName
		? sanitizeHtml(client.clientName)
		: 'Unknown MCP Client'
	const serverDescription = server.description
		? sanitizeHtml(server.description)
		: ''

	// Safe URLs
	const logoUrl = server.logo ? sanitizeHtml(server.logo) : ''
	const clientUri = client?.clientUri ? sanitizeHtml(client.clientUri) : ''
	const policyUri = client?.policyUri ? sanitizeHtml(client.policyUri) : ''
	const tosUri = client?.tosUri ? sanitizeHtml(client.tosUri) : ''

	// Client contacts
	const contacts =
		client?.contacts && client.contacts.length > 0
			? sanitizeHtml(client.contacts.join(', '))
			: ''

	// Get and validate redirect URIs
	let redirectUris: string[] = []
	let hasInvalidRedirectUris = false
	if (client?.redirectUris && client.redirectUris.length > 0) {
		// Validate each redirect URI against the allowlist
		const validUris = defaultRedirectValidator.filterValidRedirectUris(
			client.redirectUris,
		)

		if (validUris.length !== client.redirectUris.length) {
			hasInvalidRedirectUris = true
			logger.warn(
				`Client ${clientName} has invalid redirect URIs. Valid: ${validUris.length}/${client.redirectUris.length}`,
			)
		}

		redirectUris = validUris.map((uri) => sanitizeHtml(uri))
	}

	// Generate HTML for the approval dialog
	const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${clientName} | Authorization Request</title>
        <style>${APPROVAL_CSS}</style>
      </head>
      <body>
        <div class="container">
          <div class="precard">
            <div class="header">
              ${logoUrl ? `<img src="${logoUrl}" alt="${serverName} Logo" class="logo">` : ''}
            <h1 class="title"><strong>${serverName}</strong></h1>
            </div>
            
            ${serverDescription ? `<p class="description">${serverDescription}</p>` : ''}
          </div>
            
          <div class="card">
            
            <h2 class="alert"><strong>${clientName || 'A new MCP Client'}</strong> is requesting access</h1>
            
            ${
							hasInvalidRedirectUris
								? `
              <div class="warning">
                <span class="warning-icon">⚠️</span>
                <strong>Security Warning:</strong> Some redirect URIs provided by this client are not in the allowed list and have been filtered out for your security.
              </div>
            `
								: ''
						}
            
            <div class="client-info">
              <div class="client-detail">
                <div class="detail-label">Name:</div>
                <div class="detail-value">
                  ${clientName}
                </div>
              </div>
              
              ${
								clientUri
									? `
                <div class="client-detail">
                  <div class="detail-label">Website:</div>
                  <div class="detail-value small">
                    <a href="${clientUri}" target="_blank" rel="noopener noreferrer">
                      ${clientUri}
                    </a>
                  </div>
                </div>
              `
									: ''
							}
              
              ${
								policyUri
									? `
                <div class="client-detail">
                  <div class="detail-label">Privacy Policy:</div>
                  <div class="detail-value">
                    <a href="${policyUri}" target="_blank" rel="noopener noreferrer">
                      ${policyUri}
                    </a>
                  </div>
                </div>
              `
									: ''
							}
              
              ${
								tosUri
									? `
                <div class="client-detail">
                  <div class="detail-label">Terms of Service:</div>
                  <div class="detail-value">
                    <a href="${tosUri}" target="_blank" rel="noopener noreferrer">
                      ${tosUri}
                    </a>
                  </div>
                </div>
              `
									: ''
							}
              
              ${
								redirectUris.length > 0
									? `
                <div class="client-detail">
                  <div class="detail-label">Redirect URIs:</div>
                  <div class="detail-value small">
                    ${redirectUris.map((uri) => `<div>${uri}</div>`).join('')}
                  </div>
                </div>
              `
									: ''
							}
              
              ${
								contacts
									? `
                <div class="client-detail">
                  <div class="detail-label">Contact:</div>
                  <div class="detail-value">${contacts}</div>
                </div>
              `
									: ''
							}
            </div>
            
            <p>This MCP Client is requesting to be authorized on ${serverName}. If you approve, you will be redirected to complete authentication.</p>
            
            <form method="post" action="${new URL(request.url).pathname}">
              <input type="hidden" name="state" value="${encodedState}">
              
              <div class="actions">
                <button type="button" class="button button-secondary" onclick="window.history.back()">Cancel</button>
                <button type="submit" class="button button-primary">Approve</button>
              </div>
            </form>
          </div>
        </div>
      </body>
    </html>
  `

	return new Response(htmlContent, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
		},
	})
}
