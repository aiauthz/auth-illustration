import { useState, useEffect, useMemo } from 'react'
import { Stage } from '@/stage/Stage'
import { TokenChip } from '@/components/TokenChip'
import { ValidationIndicatorPositioned } from '@/components/ValidationIndicatorPositioned'
import { SlideLayout } from '@/components/SlideLayout'
import { HttpRequestPanel, type HttpRequestEntry } from '@/components/HttpRequestPanel'
import { makeJwt } from '@/lib/tokens'
import { edgeColors } from '@/lib/colors'
import { Terminal, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type FlowStep =
  | 'idle'
  | 'agent_sso'
  | 'idp_returns_id_token'
  | 'agent_requests_id_jag'
  | 'idp_issues_id_jag'
  | 'agent_presents_id_jag'
  | 'zoom_validates_id_jag'
  | 'zoom_issues_access_token'
  | 'agent_calls_api'
  | 'zoom_responds'

// Step metadata for captions and sequence numbers
const stepMetadata: Record<FlowStep, { number: number; caption: string } | null> = {
  idle: null,
  agent_sso: {
    number: 1,
    caption: 'AI Agent performs SSO on behalf of user - The AI Agent authenticates with Okta (IdP) on behalf of the user to establish identity',
  },
  idp_returns_id_token: {
    number: 2,
    caption: 'Okta issues ID Token to Agent - The Identity Provider returns an ID token to the AI Agent, proving the user\'s identity',
  },
  agent_requests_id_jag: {
    number: 3,
    caption: 'Token Exchange: Agent requests ID-JAG - Agent sends a Token Exchange request to Okta\'s token endpoint, presenting the ID token as subject_token and specifying Zoom as the target audience',
  },
  idp_issues_id_jag: {
    number: 4,
    caption: 'Okta issues ID-JAG (oauth-id-jag+jwt) - IdP validates the subject token, evaluates policy, and returns a signed Identity Assertion JWT with typ "oauth-id-jag+jwt" containing aud, client_id, scope claims',
  },
  agent_presents_id_jag: {
    number: 5,
    caption: 'JWT Bearer Grant: Agent presents ID-JAG to Zoom - Agent sends the ID-JAG as an assertion to Zoom\'s token endpoint using the jwt-bearer grant type',
  },
  zoom_validates_id_jag: {
    number: 6,
    caption: 'Zoom validates ID-JAG - Zoom verifies the JWT typ is "oauth-id-jag+jwt", validates the signature using Okta\'s JWKS, confirms aud matches its own issuer URL, and checks client_id',
  },
  zoom_issues_access_token: {
    number: 7,
    caption: 'Zoom issues Access Token (IdP-Aware) - Zoom issues access token based on validated ID-JAG. Okta maintains full visibility because it issued and scoped the ID-JAG',
  },
  agent_calls_api: {
    number: 8,
    caption: 'Agent calls Zoom API - AI Agent uses the access token to make authorized API calls to Zoom',
  },
  zoom_responds: {
    number: 9,
    caption: 'Zoom responds with data - Zoom successfully returns the requested data to the AI Agent, with full IdP visibility maintained',
  },
}

const FLOW_STEPS: FlowStep[] = [
  'idle',
  'agent_sso',
  'idp_returns_id_token',
  'agent_requests_id_jag',
  'idp_issues_id_jag',
  'agent_presents_id_jag',
  'zoom_validates_id_jag',
  'zoom_issues_access_token',
  'agent_calls_api',
  'zoom_responds',
]

/**
 * Slide 5: Cross-App Access with Identity Assertion Authorization Grant (THE SOLUTION)
 * Shows how AI Agent uses ID-JAG to request access token directly from IdP
 * This solves the visibility problem - IdP now issues the access token, not the resource server
 */
export function Slide5_CrossAppAccess() {
  const [flowStep, setFlowStep] = useState<FlowStep>('idle')
  const [idToken, setIdToken] = useState<string | null>(null)
  const [idJag, setIdJag] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isValidated, setIsValidated] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)

  const stepIndex = FLOW_STEPS.indexOf(flowStep)
  const reached = (step: FlowStep) => stepIndex >= FLOW_STEPS.indexOf(step)

  const httpEntries: HttpRequestEntry[] = useMemo(() => {
    const entries: HttpRequestEntry[] = []

    if (reached('agent_sso')) {
      entries.push({
        id: 'authorize',
        stepId: 'agent_sso',
        label: '/authorize',
        method: 'GET',
        url: 'https://okta.example.com/authorize',
        headers: [{ name: 'Host', value: 'okta.example.com' }],
        queryParams: {
          response_type: 'code',
          client_id: 'ai-agent-client-id',
          redirect_uri: 'https://agent.example.com/callback',
          scope: 'openid profile',
          state: 'agent_sso_state',
          code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
          code_challenge_method: 'S256',
        },
        response: {
          status: 302,
          statusText: 'Found',
          headers: [
            { name: 'Location', value: 'https://okta.example.com/login?...' },
          ],
          body: null,
        },
        color: edgeColors.auth,
      })
    }

    if (reached('idp_returns_id_token')) {
      entries.push({
        id: 'token',
        stepId: 'idp_returns_id_token',
        label: '/oauth/token',
        method: 'POST',
        url: 'https://okta.example.com/oauth/token',
        headers: [
          { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
          { name: 'Host', value: 'okta.example.com' },
        ],
        body: {
          grant_type: 'authorization_code',
          code: 'auth_code_xyz',
          client_id: 'ai-agent-client-id',
          client_secret: 'ai-agent-client-secret',
          redirect_uri: 'https://agent.example.com/callback',
          code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        },
        response: {
          status: 200,
          statusText: 'OK',
          headers: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Cache-Control', value: 'no-store' },
          ],
          body: {
            id_token: idToken ?? 'eyJ...',
            token_type: 'Bearer',
          },
        },
        color: edgeColors.token,
      })
    }

    if (reached('agent_requests_id_jag')) {
      entries.push({
        id: 'token-exchange',
        stepId: 'agent_requests_id_jag',
        label: '/oauth/token (Token Exchange)',
        method: 'POST',
        url: 'https://okta.example.com/oauth/token',
        headers: [
          { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
          { name: 'Host', value: 'okta.example.com' },
        ],
        body: {
          grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
          requested_token_type: 'urn:ietf:params:oauth:token-type:id-jag',
          subject_token: idToken ?? 'eyJraWQiOiJzMTZ0cVNt...',
          subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
          audience: 'https://zoom.example.com/',
          resource: 'https://api.zoom.example.com/',
          scope: 'meetings.read recordings.read',
          client_id: 'ai-agent-client-id',
          client_secret: 'ai-agent-client-secret',
        },
        response: reached('idp_issues_id_jag')
          ? {
              status: 200,
              statusText: 'OK',
              headers: [
                { name: 'Content-Type', value: 'application/json' },
                { name: 'Cache-Control', value: 'no-store' },
              ],
              body: {
                issued_token_type: 'urn:ietf:params:oauth:token-type:id-jag',
                access_token: idJag ?? 'eyJ...',
                token_type: 'N_A',
                scope: 'meetings.read recordings.read',
                expires_in: 300,
              },
            }
          : {
              status: 0,
              statusText: 'Pending...',
              headers: [],
              body: null,
            },
        color: edgeColors.consent,
      })
    }

    if (reached('agent_presents_id_jag')) {
      entries.push({
        id: 'zoom-token',
        stepId: 'agent_presents_id_jag',
        label: '/oauth/token (JWT Bearer)',
        method: 'POST',
        url: 'https://zoom.example.com/oauth/token',
        headers: [
          { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
          { name: 'Authorization', value: 'Basic YWktYWdlbnQtY2xpZW50LWlk...' },
          { name: 'Host', value: 'zoom.example.com' },
        ],
        body: {
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: idJag ?? 'eyJ...',
        },
        response: reached('zoom_issues_access_token')
          ? {
              status: 200,
              statusText: 'OK',
              headers: [
                { name: 'Content-Type', value: 'application/json' },
                { name: 'Cache-Control', value: 'no-store' },
              ],
              body: {
                access_token: accessToken ?? 'eyJ...',
                token_type: 'Bearer',
                expires_in: 86400,
                scope: 'meetings.read recordings.read',
              },
            }
          : {
              status: 0,
              statusText: 'Pending...',
              headers: [],
              body: null,
            },
        color: edgeColors.tokenAlt,
      })
    }

    if (reached('agent_calls_api')) {
      entries.push({
        id: 'zoom-api',
        stepId: 'agent_calls_api',
        label: '/v2/users/me/recordings',
        method: 'GET',
        url: 'https://api.zoom.example.com/v2/users/me/recordings',
        headers: [
          { name: 'Authorization', value: `Bearer ${accessToken ?? 'eyJ...'}` },
          { name: 'Host', value: 'api.zoom.example.com' },
        ],
        response: reached('zoom_responds')
          ? {
              status: 200,
              statusText: 'OK',
              headers: [{ name: 'Content-Type', value: 'application/json' }],
              body: {
                recordings: [
                  {
                    id: 'rec456',
                    topic: 'Team Standup',
                    start_time: '2025-11-02T10:00:00Z',
                  },
                ],
              },
            }
          : {
              status: 0,
              statusText: 'Pending...',
              headers: [],
              body: null,
            },
        color: edgeColors.apiAlt,
      })
    }

    return entries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowStep])

  // Four actors in a specific layout
  const nodes = [
    { id: 'user', x: 64, y: 180, w: 200 },
    { id: 'okta', x: 480, y: 180, w: 240 },
    {
      id: 'agent',
      x: 64,
      y: 420,
      w: 200,
      roleLabel: { text: 'Requesting App', color: 'blue' as const }
    },
    {
      id: 'zoom',
      x: 920,
      y: 420,
      w: 240,
      roleLabel: { text: 'Resource App', color: 'purple' as const }
    },
  ]

  const edges = [
    {
      id: 'user-to-agent-delegation',
      from: 'agent',
      to: 'user',
      label: 'Works on behalf of User',
      color: edgeColors.authBright,
      pulse: false,
      visible: true,
    },
    {
      id: 'agent-to-idp-sso',
      from: 'agent',
      to: 'okta',
      label: 'SSO (OIDC)',
      color: edgeColors.auth,
      pulse: flowStep === 'agent_sso',
      visible: flowStep === 'agent_sso',
    },
    {
      id: 'idp-to-agent-id-token',
      from: 'okta',
      to: 'agent',
      label: 'ID Token',
      color: edgeColors.token,
      pulse: flowStep === 'idp_returns_id_token',
      visible: flowStep === 'idp_returns_id_token',
    },
    {
      id: 'agent-to-idp-request-jag',
      from: 'agent',
      to: 'okta',
      label: 'Token Exchange (ID-JAG)',
      color: edgeColors.consent,
      pulse: flowStep === 'agent_requests_id_jag',
      visible: flowStep === 'agent_requests_id_jag',
    },
    {
      id: 'idp-to-agent-jag',
      from: 'okta',
      to: 'agent',
      label: 'ID-JAG',
      color: edgeColors.success,
      pulse: flowStep === 'idp_issues_id_jag',
      visible: flowStep === 'idp_issues_id_jag',
    },
    {
      id: 'agent-to-zoom-jag',
      from: 'agent',
      to: 'zoom',
      label: 'JWT Bearer + ID-JAG',
      color: edgeColors.tokenAlt,
      pulse: flowStep === 'agent_presents_id_jag',
      visible: flowStep === 'agent_presents_id_jag',
    },
    {
      id: 'zoom-to-idp-validate',
      from: 'zoom',
      to: 'okta',
      label: 'Validate via JWKS',
      color: edgeColors.api,
      pulse: flowStep === 'zoom_validates_id_jag',
      visible: flowStep === 'zoom_validates_id_jag',
    },
    {
      id: 'zoom-to-agent-token',
      from: 'zoom',
      to: 'agent',
      label: 'Access Token',
      color: edgeColors.success,
      pulse: flowStep === 'zoom_issues_access_token',
      visible: flowStep === 'zoom_issues_access_token',
    },
    {
      id: 'agent-to-zoom-api',
      from: 'agent',
      to: 'zoom',
      label: 'API Call',
      color: edgeColors.apiAlt,
      pulse: flowStep === 'agent_calls_api',
      visible: flowStep === 'agent_calls_api',
    },
    {
      id: 'zoom-to-agent-response',
      from: 'zoom',
      to: 'agent',
      label: 'Response',
      color: edgeColors.idToken,
      pulse: flowStep === 'zoom_responds',
      visible: flowStep === 'zoom_responds',
    },
  ]

  const handleStartFlow = () => {
    setIsValidated(false)
    setFlowStep('agent_sso')
  }

  const handleNextStep = () => {
    switch (flowStep) {
      case 'idle':
        handleStartFlow()
        break
      case 'agent_sso':
        break
      case 'idp_returns_id_token':
        setIdToken(makeJwt({
          sub: 'user@example.com',
          email: 'user@example.com',
          iss: 'https://okta.example.com',
          aud: 'ai-agent-client-id',
        }))
        setFlowStep('agent_requests_id_jag')
        break
      case 'agent_requests_id_jag':
        setFlowStep('idp_issues_id_jag')
        break
      case 'idp_issues_id_jag':
        setIdJag(makeJwt({
          sub: 'user@example.com',
          iss: 'https://okta.example.com',
          aud: 'https://zoom.example.com',
          client_id: 'ai-agent-client-id',
          scope: 'meetings.read recordings.read',
          resource: 'https://api.zoom.example.com',
        }))
        setFlowStep('agent_presents_id_jag')
        break
      case 'agent_presents_id_jag':
        setFlowStep('zoom_validates_id_jag')
        break
      case 'zoom_validates_id_jag':
        setFlowStep('zoom_issues_access_token')
        break
      case 'zoom_issues_access_token':
        setAccessToken(makeJwt({
          sub: 'user@example.com',
          iss: 'https://zoom.example.com',
          aud: 'https://api.zoom.example.com',
          scope: 'meetings.read recordings.read',
        }))
        setFlowStep('agent_calls_api')
        break
      case 'agent_calls_api':
        setFlowStep('zoom_responds')
        break
      case 'zoom_responds':
        break
    }
  }

  const handlePreviousStep = () => {
    switch (flowStep) {
      case 'zoom_responds':
        setFlowStep('agent_calls_api')
        break
      case 'agent_calls_api':
        setAccessToken(null)
        setFlowStep('zoom_issues_access_token')
        break
      case 'zoom_issues_access_token':
        setFlowStep('zoom_validates_id_jag')
        break
      case 'zoom_validates_id_jag':
        setFlowStep('agent_presents_id_jag')
        break
      case 'agent_presents_id_jag':
        setFlowStep('idp_issues_id_jag')
        break
      case 'idp_issues_id_jag':
        setIdJag(null)
        setFlowStep('agent_requests_id_jag')
        break
      case 'agent_requests_id_jag':
        setFlowStep('idp_returns_id_token')
        break
      case 'idp_returns_id_token':
        setIdToken(null)
        setIsValidated(true)
        setFlowStep('agent_sso')
        break
      case 'agent_sso':
        setIsValidated(false)
        setFlowStep('idle')
        break
    }
  }

  const handleReset = () => {
    setFlowStep('idle')
    setIdToken(null)
    setIdJag(null)
    setAccessToken(null)
    setIsValidated(false)
  }

  const canGoNext =
    flowStep !== 'idle' &&
    flowStep !== 'agent_sso' &&
    flowStep !== 'zoom_responds'

  const canGoPrevious =
    flowStep !== 'idle'

  // Auto-validate after showing validation spinner
  useEffect(() => {
    if (flowStep === 'agent_sso' && !isValidated) {
      const timer = setTimeout(() => {
        setIsValidated(true)
        setTimeout(() => {
          setFlowStep('idp_returns_id_token')
        }, 1000)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [flowStep, isValidated])

  return (
    <SlideLayout
      title="Cross App Access (Identity Assertion Authorization Grant)"
      flowStep={flowStep}
      stepMetadata={stepMetadata}
      onStart={handleStartFlow}
      onNext={handleNextStep}
      onPrevious={handlePreviousStep}
      onReset={handleReset}
      canGoNext={canGoNext}
      canGoPrevious={canGoPrevious}
    >
      {/* Full-screen Stage */}
      <div className="w-full h-full">
        <Stage nodes={nodes} edges={edges} className="w-full h-full">
          {/* IDP Validation Indicator - positioned above Okta node */}
          {flowStep === 'agent_sso' && (
            <ValidationIndicatorPositioned isValidated={isValidated} nodeId="okta" position="top" />
          )}

          {/* ID-JAG Explanation Box - Shows during Step 4 */}
          {flowStep === 'idp_issues_id_jag' && (
            <div className="absolute right-8 top-24 w-[420px] bg-green-900/95 border-2 border-green-500 p-5 rounded-lg shadow-2xl z-50 pointer-events-auto">
              <h3 className="text-lg font-bold text-green-300 mb-3 text-center flex items-center justify-center gap-2">
                Identity Assertion JWT (ID-JAG)
              </h3>
              <div className="space-y-2 text-sm text-neutral-100">
                <div className="bg-green-950/50 p-3 rounded">
                  <div className="font-semibold mb-1">What is ID-JAG?</div>
                  <div className="text-xs text-neutral-300">
                    A signed JWT (typ: <span className="font-mono text-green-300">oauth-id-jag+jwt</span>) issued by the IdP via Token Exchange. It authorizes a specific client to access a resource server on behalf of the user.
                  </div>
                </div>
                <div className="bg-green-950/50 p-3 rounded">
                  <div className="font-semibold mb-1">JWT Header</div>
                  <div className="text-xs text-neutral-300 font-mono">
                    {`{ "typ": "oauth-id-jag+jwt", "alg": "RS256" }`}
                  </div>
                </div>
                <div className="bg-green-950/50 p-3 rounded">
                  <div className="font-semibold mb-1">Required Claims</div>
                  <div className="text-xs text-neutral-300 space-y-1">
                    <div><span className="font-mono text-cyan-400">iss:</span> https://okta.example.com</div>
                    <div><span className="font-mono text-cyan-400">sub:</span> user@example.com</div>
                    <div><span className="font-mono text-cyan-400">aud:</span> https://zoom.example.com/ <span className="text-neutral-500">(Resource AS issuer)</span></div>
                    <div><span className="font-mono text-cyan-400">client_id:</span> ai-agent-client-id</div>
                    <div><span className="font-mono text-cyan-400">scope:</span> meetings.read recordings.read</div>
                    <div><span className="font-mono text-cyan-400">jti:</span> 9e43f81b64a33f20 <span className="text-neutral-500">(unique ID)</span></div>
                    <div><span className="font-mono text-cyan-400">exp/iat:</span> <span className="text-neutral-500">short-lived (300s)</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Token Display - Left side, below AI Agent actor - Compact version */}
          {(idToken || idJag || accessToken) && (
            <div className="absolute left-8 bottom-8 w-[320px] bg-neutral-900/95 p-3 rounded-lg shadow-2xl border border-neutral-800 z-50 pointer-events-auto">
              <h3 className="text-base font-semibold text-center mb-2 text-neutral-100">Token Progression</h3>
              <div className="flex flex-col gap-2">
                {/* ID Token - Show full chip when active, checkmark when complete */}
                {idToken && (flowStep === 'idp_returns_id_token' || flowStep === 'agent_requests_id_jag') ? (
                  <TokenChip
                    label="ID Token"
                    value={idToken}
                    scopes={['openid', 'profile']}
                  />
                ) : idToken && (
                  <div className="flex items-center gap-2 text-xs text-green-400 bg-green-950/30 px-2 py-1.5 rounded border border-green-500/30">
                    <span className="text-base">✓</span>
                    <span className="font-semibold">ID Token received</span>
                  </div>
                )}

                {/* ID-JAG - Show full chip when active, checkmark when complete */}
                {idJag && (flowStep === 'idp_issues_id_jag' || flowStep === 'agent_presents_id_jag' || flowStep === 'zoom_validates_id_jag') ? (
                  <TokenChip
                    label="ID-JAG"
                    value={idJag}
                    scopes={['meetings.read', 'recordings.read']}
                  />
                ) : idJag && (
                  <div className="flex items-center gap-2 text-xs text-green-400 bg-green-950/30 px-2 py-1.5 rounded border border-green-500/30">
                    <span className="text-base">✓</span>
                    <span className="font-semibold">ID-JAG received</span>
                  </div>
                )}

                {/* Access Token - Show full chip when active, checkmark when used */}
                {accessToken && flowStep === 'zoom_issues_access_token' ? (
                  <TokenChip
                    label="Access Token (from Zoom!)"
                    value={accessToken}
                    scopes={['meetings.read', 'recordings.read']}
                  />
                ) : accessToken && (flowStep === 'agent_calls_api' || flowStep === 'zoom_responds') && (
                  <div className="flex items-center gap-2 text-xs text-green-400 bg-green-950/30 px-2 py-1.5 rounded border border-green-500/30">
                    <span className="text-base">✓</span>
                    <span className="font-semibold">Access Token received</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Solution Benefits Box - Right side at final step */}
          {flowStep === 'zoom_responds' && (
            <div className="absolute right-8 top-12 w-[440px] bg-green-900/20 border-2 border-green-500/50 p-6 rounded-lg shadow-2xl z-50 pointer-events-auto">
              <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">✓</span> Problem Solved
              </h3>
              <div className="bg-green-950/50 border border-green-500/30 rounded p-4 mb-4">
                <p className="text-base text-neutral-100 font-semibold mb-2">
                  IdP maintains complete visibility
                </p>
                <p className="text-sm text-neutral-300">
                  Zoom issues the access token, but <strong>only after validating the ID-JAG from Okta</strong>. Okta maintains complete visibility and control by issuing the ID-JAG that authorizes the token.
                </p>
              </div>
              <ul className="space-y-3 text-sm text-neutral-200">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 font-bold mt-0.5">•</span>
                  <span><strong>Admin visibility:</strong> Admins can now see which apps are sharing access tokens with AI agents</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 font-bold mt-0.5">•</span>
                  <span><strong>Centralized authorization:</strong> Okta controls access by issuing or denying ID-JAG</span>
                </li>
              </ul>
            </div>
          )}
        </Stage>
      </div>

      {httpEntries.length > 0 && (
        <button
          onClick={() => setShowTerminal((v) => !v)}
          className={cn(
            'absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors',
            showTerminal
              ? 'bg-neutral-700 text-neutral-100 hover:bg-neutral-600'
              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700',
          )}
        >
          <Terminal className="h-4 w-4" />
          <span className="hidden lg:inline">HTTP Log</span>
          <span className="bg-neutral-600 text-neutral-200 text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {httpEntries.length}
          </span>
        </button>
      )}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out',
          showTerminal ? 'translate-y-0' : 'translate-y-full',
        )}
        style={{ height: '45%' }}
      >
        <div className="w-full h-full bg-neutral-950 border-t border-neutral-700 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 flex-shrink-0">
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-mono">
              <Terminal className="h-3.5 w-3.5" />
              HTTP Request Log
            </div>
            <button
              onClick={() => setShowTerminal(false)}
              className="text-neutral-500 hover:text-neutral-300 transition-colors p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <HttpRequestPanel entries={httpEntries} activeStepId={flowStep} />
          </div>
        </div>
      </div>
    </SlideLayout>
  )
}
