import { useState, useEffect } from 'react'
import { Stage } from '@/stage/Stage'
import { TokenChip } from '@/components/TokenChip'
import { ConsentDialog } from '@/components/ConsentDialog'
import { ValidationIndicatorPositioned } from '@/components/ValidationIndicatorPositioned'
import { SlideLayout } from '@/components/SlideLayout'
import { edgeColors } from '@/lib/colors'

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
  const [idToken, setIdToken] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isValidated, setIsValidated] = useState(false)
  const [showConsentDialog, setShowConsentDialog] = useState(false)

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
        setIdToken('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...')
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
        setAccessToken('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6InJlYWQud3JpdGUifQ...')
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
        setIdToken(null)
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
    setIdToken(null)
    setAccessToken(null)
    setIsValidated(false)
  }

  const handleReset = () => {
    setFlowStep('idle')
    setIdToken(null)
    setAccessToken(null)
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

          {/* Token Display - Bottom right corner */}
          {(idToken || accessToken) && flowStep !== 'zoom_responds' && (
            <div className="absolute right-8 bottom-8 w-[420px] bg-neutral-900/95 p-6 rounded-lg shadow-2xl border border-neutral-800 z-50 pointer-events-auto">
              <h3 className="text-xl font-semibold text-center mb-4 text-neutral-100">Agent Tokens</h3>
              <div className="flex flex-col gap-4">
                {idToken && (
                  <TokenChip
                    label="ID Token"
                    value={idToken}
                    scopes={['profile.email']}
                  />
                )}
                {accessToken && (
                  <TokenChip
                    label="Access Token"
                    value={accessToken}
                    scopes={['read', 'write']}
                  />
                )}
              </div>
            </div>
          )}

          {/* Security Problem Box - Right side */}
          {flowStep === 'zoom_responds' && (
            <div className="absolute right-8 top-24 w-[420px] bg-red-900/20 border-2 border-red-500/50 p-6 rounded-lg shadow-2xl z-50 pointer-events-auto">
              <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">⚠</span> Core Security Problem
              </h3>
              <div className="bg-red-950/50 border border-red-500/30 rounded p-4">
                <p className="text-base text-neutral-100 font-semibold mb-2">
                  IdP is unaware of token exchange
                </p>
                <p className="text-sm text-neutral-300">
                  When Zoom issues the access token to the AI Agent, <strong>Okta (IdP) has no visibility</strong> into this transaction.
                  The IdP only sees that the user logged in, but doesn't know an AI Agent is receiving access tokens.
                </p>
              </div>
            </div>
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
    </SlideLayout>
  )
}
