export const edgeColors = {
  auth: '#60a5fa',       // Blue - SSO/OIDC flows
  authBright: '#3b82f6', // Bright Blue - user actions
  token: '#8b5cf6',      // Purple - token issuance
  tokenAlt: '#a855f7',   // Purple variant
  idToken: '#ec4899',    // Pink - ID tokens
  consent: '#f59e0b',    // Orange - consent/warning
  success: '#10b981',    // Green - successful responses
  successBright: '#22c55e', // Lime - API success
  error: '#ef4444',      // Red - security problems
  api: '#06b6d4',        // Cyan - API calls
  apiAlt: '#f97316',     // Orange variant - API calls
} as const
