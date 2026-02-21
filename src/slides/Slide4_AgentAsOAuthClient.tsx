import { useState, useEffect, useMemo } from 'react'
import { Stage } from '@/stage/Stage'
import { ConsentDialog } from '@/components/ConsentDialog'
import { ValidationIndicatorPositioned } from '@/components/ValidationIndicatorPositioned'
import { SlideLayout } from '@/components/SlideLayout'
import { HttpRequestPanel, type HttpRequestEntry } from '@/components/HttpRequestPanel'
import { edgeColors } from '@/lib/colors'
import { InsightsPanel, type InsightEntry } from '@/components/InsightsPanel'
import { Terminal, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type FlowStep =
  | 'idle'
  | 'user_sso'
  | 'idp_validates'
  | 'idp_returns_id_token'
  | 'agent_requests_zoom'
  | 'zoom_redirects_to_idp'
  | 'idp_validates_identity'
  | 'idp_returns_id_token_to_zoom'
  | 'agent_requests_scopes'
  | 'consent_shown'
  | 'zoom_issues_access_token'
  | 'agent_calls_api'
  | 'zoom_responds'

// Step metadata for captions and sequence numbers
const stepMetadata: Record<FlowStep, { number: number; caption: string } | null> = {
  idle: null,
  user_sso: {
    number: 1,
    caption: 'AI Agent initiates SSO - The AI Agent sends SSO request to Okta (IdP) on behalf of the user to establish identity',
  },
  idp_validates: {
    number: 2,
    caption: 'IDP validates user identity - Okta verifies the user credentials and validates their identity',
  },
  idp_returns_id_token: {
    number: 3,
    caption: 'Okta issues ID Token to Agent - The Identity Provider returns an ID token to the AI Agent, proving the user\'s identity',
  },
  agent_requests_zoom: {
    number: 4,
    caption: 'Agent requests Zoom resources - AI Agent (with ID token) requests access to user\'s Zoom meeting recordings',
  },
  zoom_redirects_to_idp: {
    number: 5,
    caption: 'Zoom redirects to IDP - Zoom redirects to Okta (IdP) to verify user identity via OIDC',
  },
  idp_validates_identity: {
    number: 6,
    caption: 'IDP validates identity - Okta verifies the user identity to confirm the user is valid',
  },
  idp_returns_id_token_to_zoom: {
    number: 7,
    caption: 'Okta returns ID Token to Zoom - The Identity Provider returns an ID token to Zoom API, confirming user identity',
  },
  agent_requests_scopes: {
    number: 8,
    caption: 'Agent requests scopes - AI Agent requests specific permissions (read, write) from Zoom API',
  },
  consent_shown: {
    number: 9,
    caption: 'User grants consent - After scope request, user approves AI Agent to access Zoom API with requested permissions (read, write)',
  },
  zoom_issues_access_token: {
    number: 10,
    caption: 'Zoom issues Access Token - Zoom authorization server directly issues access token to AI Agent after user consent (IDP not involved in token issuance)',
  },
  agent_calls_api: {
    number: 11,
    caption: 'Agent calls Zoom API - The AI Agent uses the access token received from Zoom to fetch meeting recordings',
  },
  zoom_responds: {
    number: 12,
    caption: 'Zoom returns data - Zoom API validates the access token and returns the requested meeting recordings to the agent',
  },
}

/**
 * Slide 4: AI Agent as a Registered OAuth Client (The Solution)
 * Shows proper OAuth flow where AI Agent is registered as an OAuth client
 * Demonstrates secure token-based access with proper authentication and authorization
 */
export function Slide4_AgentAsOAuthClient() {
  const [flowStep, setFlowStep] = useState<FlowStep>('idle')
const [isValidated, setIsValidated] = useState(false)
  const [showConsentDialog, setShowConsentDialog] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)

  const FLOW_STEPS: FlowStep[] = [
    'idle',
    'user_sso',
    'idp_validates',
    'idp_returns_id_token',
    'agent_requests_zoom',
    'zoom_redirects_to_idp',
    'idp_validates_identity',
    'idp_returns_id_token_to_zoom',
    'agent_requests_scopes',
    'consent_shown',
    'zoom_issues_access_token',
    'agent_calls_api',
    'zoom_responds',
  ]
  const stepIndex = FLOW_STEPS.indexOf(flowStep)
  const reached = (step: FlowStep) => stepIndex >= FLOW_STEPS.indexOf(step)

  const httpEntries: HttpRequestEntry[] = useMemo(() => {
    const entries: HttpRequestEntry[] = []

    if (reached('user_sso')) {
      entries.push({
        id: 'agent-sso',
        stepId: 'user_sso',
        label: '/authorize',
        method: 'GET',
        url: 'https://okta.example.com/authorize',
        headers: [{ name: 'Host', value: 'okta.example.com' }],
        queryParams: {
          response_type: 'code',
          client_id: 'ai-agent-client-id',
          redirect_uri: 'https://agent.example.com/callback',
          scope: 'openid profile email',
          state: 'agent_state_123',
          code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
          code_challenge_method: 'S256',
        },
        response: {
          status: 302,
          statusText: 'Found',
          headers: [{ name: 'Location', value: 'https://okta.example.com/login?...' }],
          body: null,
        },
        color: edgeColors.auth,
      })
    }

    if (reached('idp_returns_id_token')) {
      entries.push({
        id: 'okta-id-token',
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
            id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
            token_type: 'Bearer',
          },
        },
        color: edgeColors.token,
      })
    }

    if (reached('agent_requests_zoom')) {
      entries.push({
        id: 'agent-zoom-request',
        stepId: 'agent_requests_zoom',
        label: '/oauth/authorize',
        method: 'GET',
        url: 'https://zoom.example.com/oauth/authorize',
        headers: [{ name: 'Host', value: 'zoom.example.com' }],
        queryParams: {
          response_type: 'code',
          client_id: 'ai-agent-client-id',
          redirect_uri: 'https://agent.example.com/zoom/callback',
          scope: 'meetings.read meetings.write',
          state: 'zoom_req_abc',
          code_challenge: 'qjrzSW9gMiUgpUvqgEPE4_-8swvyCtfOVvg55o5S_es',
          code_challenge_method: 'S256',
        },
        response: {
          status: 302,
          statusText: 'Found',
          headers: [{ name: 'Location', value: 'https://okta.example.com/authorize?...' }],
          body: null,
        },
        color: edgeColors.consent,
      })
    }

    if (reached('zoom_redirects_to_idp')) {
      entries.push({
        id: 'zoom-to-okta',
        stepId: 'zoom_redirects_to_idp',
        label: '/authorize',
        method: 'GET',
        url: 'https://okta.example.com/authorize',
        headers: [{ name: 'Host', value: 'okta.example.com' }],
        queryParams: {
          response_type: 'code',
          client_id: 'zoom-client-id',
          redirect_uri: 'https://zoom.example.com/callback',
          scope: 'openid',
          state: 'zoom_sso_state',
          code_challenge: 'Xk2M0RRUT5OkH4gUit5RWnFj2Y0GfhH6VPD7bRQzzLQ',
          code_challenge_method: 'S256',
        },
        response: {
          status: 302,
          statusText: 'Found',
          headers: [{ name: 'Location', value: 'https://zoom.example.com/callback?code=...' }],
          body: null,
        },
        color: edgeColors.success,
      })
    }

    if (reached('agent_requests_scopes')) {
      entries.push({
        id: 'agent-scopes',
        stepId: 'agent_requests_scopes',
        label: '/oauth/authorize',
        method: 'GET',
        url: 'https://zoom.example.com/oauth/authorize',
        headers: [{ name: 'Host', value: 'zoom.example.com' }],
        queryParams: {
          response_type: 'code',
          client_id: 'ai-agent-client-id',
          redirect_uri: 'https://agent.example.com/zoom/callback',
          scope: 'meetings.read meetings.write',
          state: 'agent_state_xyz',
          code_challenge: 'BMu4R5KLCl7Yyuv8GlnHmfX3DR2M1pVFtAelarJHfEA',
          code_challenge_method: 'S256',
        },
        response: {
          status: 302,
          statusText: 'Found',
          headers: [
            { name: 'Location', value: 'https://zoom.example.com/consent?...' },
          ],
          body: null,
        },
        color: edgeColors.tokenAlt,
      })
    }

    if (reached('zoom_issues_access_token')) {
      entries.push({
        id: 'zoom-access-token',
        stepId: 'zoom_issues_access_token',
        label: '/oauth/token',
        method: 'POST',
        url: 'https://zoom.example.com/oauth/token',
        headers: [
          { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
          { name: 'Host', value: 'zoom.example.com' },
        ],
        body: {
          grant_type: 'authorization_code',
          code: 'consent_code',
          client_id: 'ai-agent-client-id',
          client_secret: 'ai-agent-client-secret',
          redirect_uri: 'https://agent.example.com/zoom/callback',
          code_verifier: 'M25iVXpKU3puUjFaYWg3T1NDTDQtcW1ROUY5YXlwalNoc0hhakxifmZHag',
        },
        response: {
          status: 200,
          statusText: 'OK',
          headers: [{ name: 'Content-Type', value: 'application/json' }],
          body: {
            access_token: 'eyJhbGci...',
            token_type: 'Bearer',
            scope: 'meetings.read meetings.write',
          },
        },
        color: edgeColors.error,
      })
    }

    if (reached('agent_calls_api')) {
      entries.push({
        id: 'agent-api-call',
        stepId: 'agent_calls_api',
        label: '/v2/users/me/recordings',
        method: 'GET',
        url: 'https://api.zoom.example.com/v2/users/me/recordings',
        headers: [
          { name: 'Authorization', value: 'Bearer eyJhbGci...' },
          { name: 'Host', value: 'api.zoom.example.com' },
        ],
        response: reached('zoom_responds')
          ? {
              status: 200,
              statusText: 'OK',
              headers: [{ name: 'Content-Type', value: 'application/json' }],
              body: {
                recordings: [{ id: 'rec123', topic: 'Team Meeting' }],
              },
            }
          : {
              status: 0,
              statusText: 'Pending...',
              headers: [],
              body: null,
            },
        color: edgeColors.api,
      })
    }

    return entries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowStep])

  // Four actors in a specific layout matching the diagram
  const nodes = [
    { id: 'user', x: 64, y: 180, w: 200 },
    { id: 'okta', x: 480, y: 180, w: 240 },
    { id: 'agent', x: 64, y: 420, w: 200 },
    { id: 'zoom', x: 920, y: 420, w: 240 },
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
      pulse: flowStep === 'user_sso',
      visible: flowStep === 'user_sso',
    },
    {
      id: 'idp-to-agent-id-token',
      from: 'okta',
      to: 'agent',
      label: 'id_token',
      color: edgeColors.token,
      pulse: flowStep === 'idp_returns_id_token',
      visible: flowStep === 'idp_returns_id_token',
    },
    {
      id: 'agent-to-zoom-request',
      from: 'agent',
      to: 'zoom',
      label: 'Request Zoom Resources',
      color: edgeColors.consent,
      pulse: flowStep === 'agent_requests_zoom',
      visible: flowStep === 'agent_requests_zoom',
    },
    {
      id: 'zoom-to-idp-verify',
      from: 'zoom',
      to: 'okta',
      label: 'SSO (OIDC)',
      color: edgeColors.success,
      pulse: flowStep === 'zoom_redirects_to_idp',
      visible: flowStep === 'zoom_redirects_to_idp',
    },
    {
      id: 'idp-to-zoom-id-token',
      from: 'okta',
      to: 'zoom',
      label: 'id_token',
      color: edgeColors.idToken,
      pulse: flowStep === 'idp_returns_id_token_to_zoom',
      visible: flowStep === 'idp_returns_id_token_to_zoom',
    },
    {
      id: 'agent-to-zoom-scopes',
      from: 'agent',
      to: 'zoom',
      label: 'Request Scopes (read, write)',
      color: edgeColors.tokenAlt,
      pulse: flowStep === 'agent_requests_scopes',
      visible: flowStep === 'agent_requests_scopes',
    },
    {
      id: 'zoom-to-agent-token',
      from: 'zoom',
      to: 'agent',
      label: 'access_token',
      color: edgeColors.error,
      pulse: flowStep === 'zoom_issues_access_token',
      visible: flowStep === 'zoom_issues_access_token',
    },
    {
      id: 'agent-to-zoom-api',
      from: 'agent',
      to: 'zoom',
      label: 'API Call using access_token',
      color: edgeColors.api,
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
    setFlowStep('user_sso')
  }

  const handleNextStep = () => {
    switch (flowStep) {
      case 'idle':
        handleStartFlow()
        break
      case 'user_sso':
        setIsValidated(false)
        setFlowStep('idp_validates')
        break
      case 'idp_validates':
        break
      case 'idp_returns_id_token':
        setFlowStep('agent_requests_zoom')
        break
      case 'agent_requests_zoom':
        setFlowStep('zoom_redirects_to_idp')
        break
      case 'zoom_redirects_to_idp':
        setIsValidated(false)
        setFlowStep('idp_validates_identity')
        break
      case 'idp_validates_identity':
        break
      case 'idp_returns_id_token_to_zoom':
        setFlowStep('agent_requests_scopes')
        break
      case 'agent_requests_scopes':
        setFlowStep('consent_shown')
        setShowConsentDialog(true)
        break
      case 'consent_shown':
        break
      case 'zoom_issues_access_token':
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
        setFlowStep('zoom_issues_access_token')
        break
      case 'zoom_issues_access_token':
        setShowConsentDialog(true)
        setFlowStep('consent_shown')
        break
      case 'consent_shown':
        setShowConsentDialog(false)
        setFlowStep('agent_requests_scopes')
        break
      case 'agent_requests_scopes':
        setFlowStep('idp_returns_id_token_to_zoom')
        break
      case 'idp_returns_id_token_to_zoom':
        setIsValidated(true)
        setFlowStep('idp_validates_identity')
        break
      case 'idp_validates_identity':
        setIsValidated(false)
        setFlowStep('zoom_redirects_to_idp')
        break
      case 'zoom_redirects_to_idp':
        setFlowStep('agent_requests_zoom')
        break
      case 'agent_requests_zoom':
        setFlowStep('idp_returns_id_token')
        break
      case 'idp_returns_id_token':
        setIsValidated(true)
        setFlowStep('idp_validates')
        break
      case 'idp_validates':
        setIsValidated(false)
        setFlowStep('user_sso')
        break
      case 'user_sso':
        setFlowStep('idle')
        break
    }
  }

  const handleAllow = () => {
    setShowConsentDialog(false)
    setFlowStep('zoom_issues_access_token')
  }

  const handleDeny = () => {
    setShowConsentDialog(false)
    setFlowStep('idle')
    setIsValidated(false)
  }

  const handleReset = () => {
    setFlowStep('idle')
    setIsValidated(false)
    setShowConsentDialog(false)
  }

  const scopes = [
    { key: 'meetings.read', description: 'Read meeting recordings' },
    { key: 'meetings.write', description: 'Create & update meetings' },
  ]

  const canGoNext =
    flowStep !== 'idle' &&
    flowStep !== 'idp_validates' &&
    flowStep !== 'idp_validates_identity' &&
    flowStep !== 'consent_shown' &&
    flowStep !== 'zoom_responds'

  const canGoPrevious =
    flowStep !== 'idle'

  const insightEntries: InsightEntry[] = [
    {
      id: 'core-problem',
      stepId: 'zoom_responds',
      title: 'Core Problem: IdP Has No Visibility',
      variant: 'mixed',
      description:
        'Zoom issues the access token directly to the AI Agent. Okta (IdP) has no visibility into this transaction.',
      sections: [
        {
          heading: 'What works',
          variant: 'positive',
          items: [
            '• Agent is a registered OAuth client',
            '• Scoped access with user consent',
            '• Revocable tokens',
          ],
        },
        {
          heading: "What's missing",
          variant: 'negative',
          items: [
            '• IdP unaware of token exchange',
            '• No centralized admin visibility',
            '• No IdP policy enforcement',
          ],
        },
      ],
    },
  ]

  // Auto-validate after showing validation spinner
  useEffect(() => {
    if (flowStep === 'idp_validates' && !isValidated) {
      const timer = setTimeout(() => {
        setIsValidated(true)
        setTimeout(() => {
          setFlowStep('idp_returns_id_token')
        }, 1000)
      }, 1500)

      return () => clearTimeout(timer)
    }

    if (flowStep === 'idp_validates_identity' && !isValidated) {
      const timer = setTimeout(() => {
        setIsValidated(true)
        setTimeout(() => {
          setFlowStep('idp_returns_id_token_to_zoom')
        }, 1000)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [flowStep, isValidated])

  return (
    <SlideLayout
      title="Approach: AI Agent as a Registered OAuth Client"
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
          {(flowStep === 'idp_validates' || flowStep === 'idp_validates_identity') && (
            <ValidationIndicatorPositioned isValidated={isValidated} nodeId="okta" position="top" />
          )}

          {/* Consent Dialog */}
          <ConsentDialog
            open={showConsentDialog}
            onOpenChange={setShowConsentDialog}
            appName="Zoom"
            scopes={scopes}
            onAllow={handleAllow}
            onDeny={handleDeny}
            variant="app-to-app"
          />

        </Stage>
      </div>

      <InsightsPanel entries={insightEntries} activeStepId={flowStep} />

      {/* Terminal toggle button */}
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

      {/* Terminal drawer */}
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
