import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Stage } from '@/stage/Stage'
import { TokenChip } from '@/components/TokenChip'
import { Play, RotateCcw, ArrowRight } from 'lucide-react'

type FlowStep =
  | 'idle'
  | 'user_sso'
  | 'idp_returns_id_token'
  | 'agent_requests_zoom'
  | 'zoom_redirects_to_okta'
  | 'okta_verifies'
  | 'zoom_issues_access_token'
  | 'agent_calls_api'
  | 'zoom_responds'

// Step metadata for captions and sequence numbers
const stepMetadata: Record<FlowStep, { number: number; caption: string } | null> = {
  idle: null,
  user_sso: {
    number: 1,
    caption: 'AI Agent performs SSO on behalf of user - The AI Agent authenticates with Okta (IdP) on behalf of the user to establish identity',
  },
  idp_returns_id_token: {
    number: 2,
    caption: 'Okta issues ID Token to Agent - The Identity Provider returns an ID token to the AI Agent, proving the user\'s identity',
  },
  agent_requests_zoom: {
    number: 3,
    caption: 'Agent requests Zoom resources - AI Agent (with ID token) attempts to access user\'s Zoom meeting recordings',
  },
  zoom_redirects_to_okta: {
    number: 4,
    caption: 'Zoom redirects to Okta for authorization - Zoom API redirects the agent back to Okta to verify permissions and get authorization',
  },
  okta_verifies: {
    number: 5,
    caption: 'Okta validates and authorizes - Okta verifies user has valid Zoom account, checks requested scopes (read, write, meetings), and authorizes the AI Agent to access resources',
  },
  zoom_issues_access_token: {
    number: 6,
    caption: 'Zoom auth server issues Access Token - Zoom authorization server grants an access token to the AI Agent after Okta verification',
  },
  agent_calls_api: {
    number: 7,
    caption: 'Agent calls Zoom API - The AI Agent uses the access token received from Zoom to fetch meeting recordings',
  },
  zoom_responds: {
    number: 8,
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

  // Four actors in a specific layout matching the diagram
  const nodes = [
    { id: 'user', x: 64, y: 180, w: 200 }, // Top left - moved down
    { id: 'okta', x: 480, y: 180, w: 240 }, // Top center-right (IdP) - moved down
    { id: 'agent', x: 64, y: 420, w: 200 }, // Bottom left - moved down
    { id: 'zoom', x: 920, y: 420, w: 240 }, // Bottom right (Zoom Resource Server) - moved down
  ]

  const edges = [
    // Step 1: Agent to Okta (SSO on behalf of user)
    {
      id: 'agent-to-idp-sso',
      from: 'agent',
      to: 'okta',
      label: 'Single Sign-On (SSO)',
      color: '#60a5fa', // Blue
      pulse: flowStep === 'user_sso',
      visible: flowStep === 'user_sso',
    },
    // Step 2: Okta to Agent (ID Token)
    {
      id: 'idp-to-agent-id-token',
      from: 'okta',
      to: 'agent',
      label: 'id_token',
      color: '#8b5cf6', // Purple
      pulse: flowStep === 'idp_returns_id_token',
      visible: flowStep === 'idp_returns_id_token',
    },
    // Step 3: Agent to Zoom (Request Resources)
    {
      id: 'agent-to-zoom-request',
      from: 'agent',
      to: 'zoom',
      label: 'Request Zoom Resources',
      color: '#f59e0b', // Orange
      pulse: flowStep === 'agent_requests_zoom',
      visible: flowStep === 'agent_requests_zoom',
    },
    // Step 4: Zoom to Okta (Redirect for Authorization)
    {
      id: 'zoom-to-okta-redirect',
      from: 'zoom',
      to: 'okta',
      label: 'Redirect to Okta for Auth',
      color: '#10b981', // Green
      pulse: flowStep === 'zoom_redirects_to_okta',
      visible: flowStep === 'zoom_redirects_to_okta',
    },
    // Step 5: Okta verifies (visual indication)
    {
      id: 'okta-verify',
      from: 'okta',
      to: 'okta',
      label: 'Verifies & Authorizes',
      color: '#a855f7', // Purple variant
      pulse: flowStep === 'okta_verifies',
      visible: flowStep === 'okta_verifies',
    },
    // Step 6: Zoom to Agent (Access Token) - THE PROBLEM!
    {
      id: 'zoom-to-agent-token',
      from: 'zoom',
      to: 'agent',
      label: 'access_token',
      color: '#ef4444', // RED - This is the problem!
      pulse: flowStep === 'zoom_issues_access_token',
      visible: flowStep === 'zoom_issues_access_token',
    },
    // Step 7: Agent to Zoom (API Call with token)
    {
      id: 'agent-to-zoom-api',
      from: 'agent',
      to: 'zoom',
      label: 'API Call using access_token',
      color: '#06b6d4', // Cyan
      pulse: flowStep === 'agent_calls_api',
      visible: flowStep === 'agent_calls_api',
    },
    // Step 8: Zoom to Agent (Response)
    {
      id: 'zoom-to-agent-response',
      from: 'zoom',
      to: 'agent',
      label: 'Response',
      color: '#ec4899', // Pink
      pulse: flowStep === 'zoom_responds',
      visible: flowStep === 'zoom_responds',
    },
  ]

  const handleStartFlow = () => {
    setFlowStep('user_sso')
  }

  const handleNextStep = () => {
    switch (flowStep) {
      case 'idle':
        handleStartFlow()
        break
      case 'user_sso':
        setFlowStep('idp_returns_id_token')
        break
      case 'idp_returns_id_token':
        // Set ID token
        setIdToken('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...')
        setFlowStep('agent_requests_zoom')
        break
      case 'agent_requests_zoom':
        setFlowStep('zoom_redirects_to_okta')
        break
      case 'zoom_redirects_to_okta':
        setFlowStep('okta_verifies')
        break
      case 'okta_verifies':
        setFlowStep('zoom_issues_access_token')
        break
      case 'zoom_issues_access_token':
        // Set access token (issued by Zoom, not Okta!)
        setAccessToken('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6InJlYWQud3JpdGUifQ...')
        setFlowStep('agent_calls_api')
        break
      case 'agent_calls_api':
        setFlowStep('zoom_responds')
        break
      case 'zoom_responds':
        // Final step
        break
    }
  }

  const handleReset = () => {
    setFlowStep('idle')
    setIdToken(null)
    setAccessToken(null)
  }

  const canGoNext = 
    flowStep !== 'idle' && 
    flowStep !== 'zoom_responds'

  // Listen for global next step event (from presentation clicker)
  useEffect(() => {
    const handleGlobalNextStep = () => {
      if (flowStep === 'idle') {
        handleStartFlow()
      } else if (canGoNext) {
        handleNextStep()
      }
    }

    window.addEventListener('slideNextStep', handleGlobalNextStep)
    return () => {
      window.removeEventListener('slideNextStep', handleGlobalNextStep)
    }
  }, [flowStep, canGoNext])

  return (
    <div className="flex flex-col w-full h-full relative">
      {/* Control Buttons - Top left */}
      <div className="absolute top-4 left-4 z-50 flex gap-4">
        {flowStep === 'idle' ? (
          <Button onClick={handleStartFlow} size="lg" className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700 shadow-lg">
            <Play className="h-5 w-5 mr-2" />
            Start Flow
          </Button>
        ) : (
          <>
            <Button
              onClick={handleNextStep}
              disabled={!canGoNext}
              size="lg"
              className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700 disabled:opacity-50 shadow-lg"
            >
              <ArrowRight className="h-5 w-5 mr-2" />
              Next Step
            </Button>
            <Button onClick={handleReset} variant="outline" size="lg" className="bg-neutral-900 border-neutral-700 text-neutral-200 hover:bg-neutral-800 shadow-lg">
              <RotateCcw className="h-5 w-5 mr-2" />
              Reset
            </Button>
          </>
        )}
      </div>

      {/* Slide Title - Top center */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
        <h2 className="text-2xl font-bold text-neutral-100 bg-neutral-800/90 px-6 py-3 rounded-lg shadow-lg border border-neutral-700">
          Approach: AI Agent as a Registered OAuth Client
        </h2>
      </div>

      {/* Closed Caption - Bottom center */}
      {flowStep !== 'idle' && stepMetadata[flowStep] && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-[900px] w-[90%]">
          <div className="bg-black/90 text-white px-6 py-4 rounded-lg shadow-2xl border border-neutral-700">
            <div className="flex items-start gap-4">
              <div className="bg-neutral-700 text-neutral-100 px-3 py-1 rounded font-bold text-sm flex-shrink-0 mt-0.5">
                {stepMetadata[flowStep]!.number}
              </div>
              <p className="text-base leading-relaxed">{stepMetadata[flowStep]!.caption}</p>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen Stage */}
      <div className="w-full h-full">
        <Stage nodes={nodes} edges={edges} className="w-full h-full">
          {/* Okta Validation Box - Top right during Step 5 */}
          {flowStep === 'okta_verifies' && (
            <div className="absolute right-8 top-24 w-[380px] bg-blue-900/95 border-2 border-blue-500 p-5 rounded-lg shadow-2xl z-50 pointer-events-auto">
              <h3 className="text-lg font-bold text-blue-300 mb-3 text-center flex items-center justify-center gap-2">
                <span className="text-xl">🔍</span> Validating
              </h3>
              <div className="space-y-2 text-xs text-neutral-100">
                <div className="flex items-center gap-2 bg-blue-950/50 p-2 rounded">
                  <span className="text-green-400 text-lg">✓</span>
                  <div>
                    <div className="font-semibold text-sm">User Account</div>
                    <div className="text-[10px] text-neutral-300">Valid Zoom account</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-blue-950/50 p-2 rounded">
                  <span className="text-green-400 text-lg">✓</span>
                  <div>
                    <div className="font-semibold text-sm">Scopes</div>
                    <div className="text-[10px] text-neutral-300">read, write, meetings</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-blue-950/50 p-2 rounded">
                  <span className="text-green-400 text-lg">✓</span>
                  <div>
                    <div className="font-semibold text-sm">OAuth Client</div>
                    <div className="text-[10px] text-neutral-300">AI Agent registered</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-blue-950/50 p-2 rounded">
                  <span className="text-green-400 text-lg">✓</span>
                  <div>
                    <div className="font-semibold text-sm">Authorization</div>
                    <div className="text-[10px] text-neutral-300">Approved</div>
                  </div>
                </div>
              </div>
            </div>
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
        </Stage>
      </div>
    </div>
  )
}
