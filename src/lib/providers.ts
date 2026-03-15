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
    supportedFlows: ['authorization_code_pkce', 'authorization_code', 'implicit'],
    notes: 'Supports PKCE for public clients. Token endpoint allows CORS.',
    docUrl: 'https://developers.google.com/identity/protocols/oauth2',
    supportsPkce: true,
    tokenEndpointCors: true,
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
      'Does NOT support PKCE. Token endpoint does NOT allow CORS. Requires backend proxy for token exchange. Set Accept: application/json header.',
    docUrl: 'https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps',
    supportsPkce: false,
    tokenEndpointCors: false,
  },
  {
    id: 'okta',
    name: 'Okta',
    authorizationUrl: '', // User must provide issuer URL
    tokenUrl: '',
    userinfoUrl: '',
    jwksUrl: '',
    defaultScopes: ['openid', 'profile', 'email'],
    supportedFlows: ['authorization_code_pkce', 'authorization_code', 'client_credentials', 'implicit'],
    notes:
      'Full OIDC support with PKCE. Set issuer URL to: https://{your-domain}.okta.com/oauth2/default',
    docUrl: 'https://developer.okta.com/docs/guides/',
    supportsPkce: true,
    tokenEndpointCors: true,
  },
  {
    id: 'auth0',
    name: 'Auth0',
    authorizationUrl: '', // User must provide domain
    tokenUrl: '',
    userinfoUrl: '',
    jwksUrl: '',
    defaultScopes: ['openid', 'profile', 'email'],
    supportedFlows: ['authorization_code_pkce', 'authorization_code', 'client_credentials', 'implicit'],
    notes:
      'Full OIDC support with PKCE. Set issuer URL to: https://{your-domain}.auth0.com',
    docUrl: 'https://auth0.com/docs/get-started/authentication-and-authorization-flow',
    supportsPkce: true,
    tokenEndpointCors: true,
  },
  {
    id: 'custom',
    name: 'Custom Provider',
    authorizationUrl: '',
    tokenUrl: '',
    defaultScopes: [],
    supportedFlows: ['authorization_code_pkce', 'authorization_code', 'client_credentials', 'implicit'],
    notes: 'Enter your own OAuth/OIDC provider endpoints.',
    docUrl: '',
    supportsPkce: true,
    tokenEndpointCors: true,
  },
]

/** Get a provider by ID */
export function getProvider(id: string): OAuthProviderConfig | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

/** Build Okta/Auth0 URLs from an issuer URL */
export function buildOidcUrls(issuerUrl: string) {
  const base = issuerUrl.replace(/\/$/, '')
  return {
    authorizationUrl: `${base}/v1/authorize`,
    tokenUrl: `${base}/v1/token`,
    userinfoUrl: `${base}/v1/userinfo`,
    jwksUrl: `${base}/v1/keys`,
  }
}
