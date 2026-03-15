/**
 * Manages OAuth flow state across redirects using sessionStorage.
 * State is stored only for the duration of the browser tab.
 */

const STORAGE_KEY = 'oauth_playground_flow'

export interface StoredFlowState {
  flowId: string
  providerId: string
  flowType: string
  clientId: string
  redirectUri: string
  scopes: string[]
  codeVerifier?: string
  codeChallenge?: string
  state: string
  nonce?: string
  startedAt: number
  authorizationUrl: string
  tokenUrl: string
  /** Pre-redirect HTTP log entries (serialized) */
  preRedirectLog: string
}

/** Save flow state before redirect */
export function saveFlowState(state: StoredFlowState): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/** Restore flow state after redirect */
export function restoreFlowState(): StoredFlowState | null {
  const data = sessionStorage.getItem(STORAGE_KEY)
  if (!data) return null
  try {
    return JSON.parse(data) as StoredFlowState
  } catch {
    return null
  }
}

/** Clear flow state */
export function clearFlowState(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}

/** Check if a pending flow exists */
export function hasPendingFlow(): boolean {
  return sessionStorage.getItem(STORAGE_KEY) !== null
}

/** Clear all playground-related session data */
export function clearAllPlaygroundData(): void {
  sessionStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem('oauth_playground_credentials')
}

/** Temporarily store credentials in sessionStorage (tab-only, never persisted) */
export function saveCredentials(creds: {
  clientId: string
  clientSecret?: string
  redirectUri: string
  scopes: string[]
}): void {
  sessionStorage.setItem('oauth_playground_credentials', JSON.stringify(creds))
}

/** Restore saved credentials */
export function restoreCredentials(): {
  clientId: string
  clientSecret?: string
  redirectUri: string
  scopes: string[]
} | null {
  const data = sessionStorage.getItem('oauth_playground_credentials')
  if (!data) return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}
