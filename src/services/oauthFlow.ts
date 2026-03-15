/**
 * OAuth flow orchestration service.
 * Coordinates the real OAuth flow and emits events for the UI.
 */

import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  generateNonce,
} from '@/lib/pkce'
import { saveFlowState, type StoredFlowState } from '@/lib/flowState'
import type { OAuthProviderConfig, OAuthFlowType } from '@/lib/providers'
import type { HttpRequestEntry } from '@/components/HttpRequestPanel'
import { edgeColors } from '@/lib/colors'

export interface FlowConfig {
  provider: OAuthProviderConfig
  flowType: OAuthFlowType
  clientId: string
  clientSecret?: string
  redirectUri: string
  scopes: string[]
  authorizationUrl: string
  tokenUrl: string
}

export interface FlowEvent {
  type: 'step' | 'http_request' | 'token_received' | 'error' | 'redirect' | 'complete'
  stepId: string
  label: string
  httpEntry?: HttpRequestEntry
  token?: { type: string; value: string }
  error?: string
  redirectUrl?: string
}

let eventCounter = 0
function nextId() {
  return `evt-${++eventCounter}`
}

/**
 * Initiates the Authorization Code + PKCE flow.
 * Returns pre-redirect events, then triggers the redirect.
 */
export async function startAuthCodePkceFlow(config: FlowConfig): Promise<FlowEvent[]> {
  const events: FlowEvent[] = []

  // Step 1: Generate PKCE pair
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  events.push({
    type: 'step',
    stepId: 'generate_pkce',
    label: 'Generate PKCE code_verifier and code_challenge (SHA-256)',
  })

  // Step 2: Generate state and nonce
  const state = generateState()
  const nonce = generateNonce()

  events.push({
    type: 'step',
    stepId: 'generate_state',
    label: 'Generate state (CSRF protection) and nonce (replay protection)',
  })

  // Step 3: Build authorization URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    ...(config.provider.extraAuthParams ?? {}),
  })

  const authUrl = `${config.authorizationUrl}?${params.toString()}`

  const httpEntry: HttpRequestEntry = {
    id: nextId(),
    stepId: 'authorize_redirect',
    label: 'GET /authorize',
    method: 'GET',
    url: config.authorizationUrl,
    headers: [],
    queryParams: {
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    },
    response: {
      status: 302,
      statusText: 'Found (redirect to login)',
      headers: [{ name: 'Location', value: `${config.authorizationUrl}/login?...` }],
      body: null,
    },
    color: edgeColors.auth,
  }

  events.push({
    type: 'http_request',
    stepId: 'authorize_redirect',
    label: 'Redirect to authorization endpoint',
    httpEntry,
  })

  // Save state for post-redirect resumption
  const flowState: StoredFlowState = {
    flowId: state,
    providerId: config.provider.id,
    flowType: config.flowType,
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    scopes: config.scopes,
    codeVerifier,
    codeChallenge,
    state,
    nonce,
    startedAt: Date.now(),
    authorizationUrl: config.authorizationUrl,
    tokenUrl: config.tokenUrl,
    preRedirectLog: JSON.stringify(events),
  }
  saveFlowState(flowState)

  events.push({
    type: 'redirect',
    stepId: 'redirect',
    label: 'Redirecting to provider...',
    redirectUrl: authUrl,
  })

  return events
}

/**
 * Exchanges an authorization code for tokens (PKCE flow).
 * Called after the redirect callback.
 */
/**
 * Generic token endpoint POST. Used by all token exchange flows.
 */
async function postTokenEndpoint(
  tokenUrl: string,
  params: Record<string, string>,
): Promise<{
  tokens: Record<string, unknown> | null
  error?: string
}> {
  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams(params).toString(),
    })

    let responseBody: Record<string, unknown> | null = null
    try {
      responseBody = await response.json()
    } catch {
      // Response may not be JSON
    }

    if (!response.ok) {
      return {
        tokens: null,
        error: `Token exchange failed: ${response.status} ${response.statusText}`,
      }
    }

    return { tokens: responseBody }
  } catch (err) {
    return {
      tokens: null,
      error: err instanceof Error ? err.message : 'Token exchange failed',
    }
  }
}

/** Exchange auth code with client_secret (confidential client, no PKCE). */
export function exchangeCodeWithSecret(
  tokenUrl: string,
  code: string,
  clientId: string,
  redirectUri: string,
  clientSecret: string,
) {
  return postTokenEndpoint(tokenUrl, {
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    client_secret: clientSecret,
  })
}

/** Exchange client credentials for token (M2M flow). */
export function exchangeClientCredentials(
  tokenUrl: string,
  clientId: string,
  clientSecret: string,
  scope: string,
) {
  return postTokenEndpoint(tokenUrl, {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope,
  })
}

export async function exchangeCodeForTokens(
  tokenUrl: string,
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<{
  httpEntry: HttpRequestEntry
  tokens: Record<string, unknown> | null
  error?: string
}> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  })

  const requestEntry: HttpRequestEntry = {
    id: nextId(),
    stepId: 'token_exchange',
    label: 'POST /oauth/token',
    method: 'POST',
    url: tokenUrl,
    headers: [
      { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
    ],
    body: {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    },
    response: {
      status: 0,
      statusText: 'Pending...',
      headers: [],
      body: null,
    },
    color: edgeColors.token,
  }

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    const responseHeaders = Array.from(response.headers.entries()).map(([name, value]) => ({
      name,
      value,
    }))

    let responseBody: Record<string, unknown> | null = null
    try {
      responseBody = await response.json()
    } catch {
      // Response may not be JSON
    }

    requestEntry.response = {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
    }

    if (!response.ok) {
      return {
        httpEntry: requestEntry,
        tokens: null,
        error: `Token exchange failed: ${response.status} ${response.statusText}`,
      }
    }

    return { httpEntry: requestEntry, tokens: responseBody }
  } catch (err) {
    requestEntry.response = {
      status: 0,
      statusText: 'Network Error',
      headers: [],
      body: { error: err instanceof Error ? err.message : 'Unknown error' },
    }

    return {
      httpEntry: requestEntry,
      tokens: null,
      error: err instanceof Error ? err.message : 'Token exchange failed',
    }
  }
}
