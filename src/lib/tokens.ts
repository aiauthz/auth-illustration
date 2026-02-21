/**
 * Generate a fake JWT-like token for visualization purposes.
 * Format: base64(header).base64(payload).base64(signature)
 */
export function makeJwt(payload: Record<string, unknown>): string {
  // Create a fake header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: Math.random().toString(36).substring(7),
  }

  // Add timestamp to payload if not present
  const enrichedPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    jti: Math.random().toString(36).substring(7),
  }

  // Simple base64-like encoding (just for visualization, not real crypto)
  const encode = (obj: unknown): string => {
    const str = JSON.stringify(obj)
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
      .substring(0, 20) // Truncate to keep it short
  }

  const headerPart = encode(header)
  const payloadPart = encode(enrichedPayload)
  const signaturePart = btoa(Math.random().toString(36))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, 27)

  return `${headerPart}.${payloadPart}.${signaturePart}`
}

/** Generate a fake PKCE code_verifier (base64url random string) */
export function makePkceVerifier(length = 43): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/** Generate a fake PKCE code_challenge (SHA-256 base64url output) */
export function makePkceChallenge(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  let result = ''
  for (let i = 0; i < 43; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/** Generate a fake authorization code */
export function makeAuthCode(): string {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10)
}
