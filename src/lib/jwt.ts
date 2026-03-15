/**
 * JWT decoding utilities for the playground.
 * Decodes tokens for display — does NOT verify signatures.
 */

export interface DecodedJwt {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
  raw: {
    header: string
    payload: string
    signature: string
  }
  isValid: boolean
  error?: string
}

/** Claim annotations for educational display */
export const claimAnnotations: Record<string, { label: string; description: string }> = {
  iss: { label: 'Issuer', description: 'Who issued this token' },
  sub: { label: 'Subject', description: 'Who this token represents' },
  aud: { label: 'Audience', description: 'Intended recipient of this token' },
  exp: { label: 'Expires', description: 'When this token expires' },
  iat: { label: 'Issued At', description: 'When this token was created' },
  nbf: { label: 'Not Before', description: 'Token not valid before this time' },
  jti: { label: 'JWT ID', description: 'Unique identifier for this token' },
  scope: { label: 'Scopes', description: 'Permissions granted to this token' },
  email: { label: 'Email', description: "User's email address" },
  name: { label: 'Name', description: "User's display name" },
  nonce: { label: 'Nonce', description: 'Value to prevent replay attacks' },
  azp: { label: 'Authorized Party', description: 'Client that was authorized' },
  at_hash: { label: 'Access Token Hash', description: 'Hash of the access token' },
  c_hash: { label: 'Code Hash', description: 'Hash of the authorization code' },
  typ: { label: 'Token Type', description: 'Type of JWT token' },
  alg: { label: 'Algorithm', description: 'Signing algorithm used' },
  kid: { label: 'Key ID', description: 'Identifier for the signing key' },
}

/** Decode a JWT string into its parts. Does not verify signature. */
export function decodeJwt(token: string): DecodedJwt {
  const parts = token.split('.')

  if (parts.length !== 3) {
    return {
      header: {},
      payload: {},
      signature: '',
      raw: { header: '', payload: '', signature: '' },
      isValid: false,
      error: `Expected 3 parts, got ${parts.length}`,
    }
  }

  const [rawHeader, rawPayload, rawSignature] = parts

  try {
    const header = JSON.parse(base64UrlDecode(rawHeader))
    const payload = JSON.parse(base64UrlDecode(rawPayload))

    return {
      header,
      payload,
      signature: rawSignature,
      raw: { header: rawHeader, payload: rawPayload, signature: rawSignature },
      isValid: true,
    }
  } catch {
    return {
      header: {},
      payload: {},
      signature: rawSignature,
      raw: { header: rawHeader, payload: rawPayload, signature: rawSignature },
      isValid: false,
      error: 'Failed to decode token',
    }
  }
}

/** Format a Unix timestamp as a human-readable string */
export function formatTimestamp(ts: number): string {
  const date = new Date(ts * 1000)
  return date.toLocaleString()
}

/** Calculate time remaining until expiry */
export function timeUntilExpiry(exp: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = exp - now
  if (diff <= 0) return 'Expired'
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`
}

/** Base64url decode to string */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padding = base64.length % 4
  if (padding) {
    base64 += '='.repeat(4 - padding)
  }
  return atob(base64)
}
