/**
 * OAuth provider registry.
 * Pre-configured endpoints and quirks for common providers.
 */

export interface OAuthProviderConfig {
  id: string
  name: string
  authorizationUrl: string
  tokenUrl: string
  userinfoUrl?: string
  jwksUrl?: string
  defaultScopes: string[]
  supportedFlows: OAuthFlowType[]
  notes: string
  docUrl: string
  /** Whether this provider supports PKCE (most do, GitHub doesn't) */
  supportsPkce: boolean
  /** Whether token endpoint allows CORS (needed for client-side token exchange) */
  tokenEndpointCors: boolean
  /** Extra params to include in the authorization request */
  extraAuthParams?: Record<string, string>
  /** Extra params to include in the token request */
  extraTokenParams?: Record<string, string>
  /** Whether the user needs to provide an issuer URL */
  needsIssuerUrl?: boolean
}

export type OAuthFlowType =
  | 'authorization_code_pkce'
  | 'authorization_code'
  | 'client_credentials'
  | 'implicit'

export const PROVIDERS: OAuthProviderConfig[] = [
  {
    id: 'google',
    name: 'Google',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userinfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
    defaultScopes: ['openid', 'profile', 'email'],
    supportedFlows: ['authorization_code_pkce'],
    notes:
      'Supports PKCE for public clients. Token endpoint allows CORS. You need to create OAuth credentials at console.cloud.google.com and add the redirect URI to the authorized list.',
    docUrl: 'https://developers.google.com/identity/protocols/oauth2',
    supportsPkce: true,
    tokenEndpointCors: true,
    extraAuthParams: { access_type: 'online' },
  },
  {
    id: 'github',
    name: 'GitHub',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userinfoUrl: 'https://api.github.com/user',
    defaultScopes: ['read:user', 'user:email'],
    supportedFlows: ['authorization_code'],
    notes:
      'GitHub does NOT support PKCE and its token endpoint blocks CORS. You need a backend proxy to exchange the code for tokens. GitHub also returns form-encoded responses by default — you must set Accept: application/json.',
    docUrl: 'https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps',
    supportsPkce: false,
    tokenEndpointCors: false,
  },
  {
    id: 'auth0',
    name: 'Auth0',
    authorizationUrl: '',
    tokenUrl: '',
    userinfoUrl: '',
    jwksUrl: '',
    defaultScopes: ['openid', 'profile', 'email'],
    supportedFlows: ['authorization_code_pkce'],
    notes:
      'Full OIDC support with PKCE. Enter your Auth0 domain as the issuer URL, like: https://dev-xxxxx.us.auth0.com. Token endpoint supports CORS for PKCE public clients. You may also need to set an API audience in your Auth0 dashboard.',
    docUrl: 'https://auth0.com/docs/get-started/authentication-and-authorization-flow',
    supportsPkce: true,
    tokenEndpointCors: true,
    needsIssuerUrl: true,
  },
  {
    id: 'okta',
    name: 'Okta',
    authorizationUrl: '',
    tokenUrl: '',
    userinfoUrl: '',
    jwksUrl: '',
    defaultScopes: ['openid', 'profile', 'email'],
    supportedFlows: ['authorization_code_pkce'],
    notes:
      'Full OIDC support with PKCE. Enter your Okta authorization server URL as the issuer, like: https://dev-xxxxx.okta.com/oauth2/default. The /oauth2/default part is important — it specifies the default authorization server.',
    docUrl: 'https://developer.okta.com/docs/guides/',
    supportsPkce: true,
    tokenEndpointCors: true,
    needsIssuerUrl: true,
  },
  {
    id: 'custom',
    name: 'Custom Provider',
    authorizationUrl: '',
    tokenUrl: '',
    defaultScopes: [],
    supportedFlows: ['authorization_code_pkce', 'authorization_code', 'client_credentials', 'implicit'],
    notes: 'Enter your own OAuth/OIDC provider endpoints manually. Use the issuer URL field if your provider supports OIDC discovery, or fill in the client ID and endpoints directly.',
    docUrl: '',
    supportsPkce: true,
    tokenEndpointCors: true,
    needsIssuerUrl: true,
  },
]

/** Get a provider by ID */
export function getProvider(id: string): OAuthProviderConfig | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

/**
 * Build OIDC URLs from an issuer URL, using provider-specific path conventions.
 *
 * Auth0:  {domain}/authorize,       {domain}/oauth/token
 * Okta:   {issuer}/v1/authorize,    {issuer}/v1/token
 * Custom: tries OIDC discovery convention first (/authorize, /oauth/token)
 */
export function buildOidcUrls(issuerUrl: string, providerId?: string) {
  const base = issuerUrl.replace(/\/$/, '')

  if (providerId === 'auth0') {
    return {
      authorizationUrl: `${base}/authorize`,
      tokenUrl: `${base}/oauth/token`,
      userinfoUrl: `${base}/userinfo`,
      jwksUrl: `${base}/.well-known/jwks.json`,
    }
  }

  if (providerId === 'okta') {
    return {
      authorizationUrl: `${base}/v1/authorize`,
      tokenUrl: `${base}/v1/token`,
      userinfoUrl: `${base}/v1/userinfo`,
      jwksUrl: `${base}/v1/keys`,
    }
  }

  // Custom / unknown — use common OIDC conventions
  return {
    authorizationUrl: `${base}/authorize`,
    tokenUrl: `${base}/oauth/token`,
    userinfoUrl: `${base}/userinfo`,
    jwksUrl: `${base}/.well-known/jwks.json`,
  }
}
