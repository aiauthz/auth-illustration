import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Stage } from '@/stage/Stage'
import { TokenChip } from '@/components/TokenChip'
import { Play, RotateCcw, ArrowRight, ArrowLeft } from 'lucide-react'
import { makeJwt } from '@/lib/tokens'

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
    caption: 'Agent requests Identity Assertion JWT (ID-JAG) - AI Agent uses ID token to request an Identity Assertion Authorization Grant from Okta for Zoom access',
  },
  idp_issues_id_jag: {
    number: 4,
    caption: 'Okta issues ID-JAG to Agent - The IdP creates and signs an Identity Assertion JWT Authorization Grant specifically for Zoom API access',
  },
  agent_presents_id_jag: {
    number: 5,
    caption: 'Agent presents ID-JAG to Zoom - AI Agent presents the Identity Assertion JWT to Zoom API to request an access token',
  },
  zoom_validates_id_jag: {
    number: 6,
    caption: 'Zoom validates ID-JAG with Okta - Zoom verifies the ID-JAG signature using Okta\'s published keys to ensure it was issued by the trusted IdP',
  },
  zoom_issues_access_token: {
    number: 7,
    caption: '✓ THE SOLUTION: Zoom issues Access Token (Okta Aware) - Zoom issues access token based on validated ID-JAG. Okta maintains visibility through the ID-JAG it issued',
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

  // Four actors in a specific layout
  const nodes = [
    { id: 'user', x: 64, y: 180, w: 200 }, // Top left
    { id: 'okta', x: 480, y: 180, w: 240 }, // Top center-right (IdP)
    { id: 'agent', x: 64, y: 420, w: 200 }, // Bottom left
    { id: 'zoom', x: 920, y: 420, w: 240 }, // Bottom right (Zoom Resource Server)
  ]

  const edges = [
    // Step 1: Agent to Okta (SSO)
    {
      id: 'agent-to-idp-sso',
      from: 'agent',
      to: 'okta',
      label: 'SSO',
      color: '#60a5fa', // Blue
      pulse: flowStep === 'agent_sso',
      visible: flowStep === 'agent_sso',
    },
    // Step 2: Okta to Agent (ID Token)
    {
      id: 'idp-to-agent-id-token',
      from: 'okta',
      to: 'agent',
      label: 'ID Token',
      color: '#8b5cf6', // Purple
      pulse: flowStep === 'idp_returns_id_token',
      visible: flowStep === 'idp_returns_id_token',
    },
    // Step 3: Agent to Okta (Request ID-JAG with ID Token)
    {
      id: 'agent-to-idp-request-jag',
      from: 'agent',
      to: 'okta',
      label: 'Request ID-JAG',
      color: '#f59e0b', // Orange
      pulse: flowStep === 'agent_requests_id_jag',
      visible: flowStep === 'agent_requests_id_jag',
    },
    // Step 4: Okta to Agent (ID-JAG)
    {
      id: 'idp-to-agent-jag',
      from: 'okta',
      to: 'agent',
      label: 'ID-JAG',
      color: '#10b981', // Green
      pulse: flowStep === 'idp_issues_id_jag',
      visible: flowStep === 'idp_issues_id_jag',
    },
    // Step 5: Agent to Zoom (Present ID-JAG)
    {
      id: 'agent-to-zoom-jag',
      from: 'agent',
      to: 'zoom',
      label: 'Present ID-JAG',
      color: '#a855f7', // Purple variant
      pulse: flowStep === 'agent_presents_id_jag',
      visible: flowStep === 'agent_presents_id_jag',
    },
    // Step 6: Zoom to Okta (Validate ID-JAG)
    {
      id: 'zoom-to-idp-validate',
      from: 'zoom',
      to: 'okta',
      label: 'Validate ID-JAG',
      color: '#06b6d4', // Cyan
      pulse: flowStep === 'zoom_validates_id_jag',
      visible: flowStep === 'zoom_validates_id_jag',
    },
    // Step 7: Zoom to Agent (Access Token) - THE SOLUTION!
    {
      id: 'zoom-to-agent-token',
      from: 'zoom',
      to: 'agent',
      label: 'Access Token',
      color: '#10b981', // Green - Zoom issues token but Okta aware!
      pulse: flowStep === 'zoom_issues_access_token',
      visible: flowStep === 'zoom_issues_access_token',
    },
    // Step 8: Agent to Zoom (API Call)
    {
      id: 'agent-to-zoom-api',
      from: 'agent',
      to: 'zoom',
      label: 'API Call',
      color: '#f97316', // Orange
      pulse: flowStep === 'agent_calls_api',
      visible: flowStep === 'agent_calls_api',
    },
    // Step 9: Zoom to Agent (Response)
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
    setFlowStep('agent_sso')
  }

  const handleNextStep = () => {
    switch (flowStep) {
      case 'idle':
        handleStartFlow()
        break
      case 'agent_sso':
        setFlowStep('idp_returns_id_token')
        break
      case 'idp_returns_id_token':
        // Set ID token
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
        // Set ID-JAG
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
        // Set access token (issued by Zoom, but authorized by Okta via ID-JAG!)
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
        // Final step
        break
    }
  }

  const handlePreviousStep = () => {
    switch (flowStep) {
      case 'zoom_responds':
        setFlowStep('agent_calls_api')
        break
      case 'agent_calls_api':
        // Clear access token when going back before it was issued
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
        // Clear ID-JAG when going back before it was issued
        setIdJag(null)
        setFlowStep('agent_requests_id_jag')
        break
      case 'agent_requests_id_jag':
        setFlowStep('idp_returns_id_token')
        break
      case 'idp_returns_id_token':
        // Clear ID token when going back before it was issued
        setIdToken(null)
        setFlowStep('agent_sso')
        break
      case 'agent_sso':
        setFlowStep('idle')
        break
    }
  }

  const handleReset = () => {
    setFlowStep('idle')
    setIdToken(null)
    setIdJag(null)
    setAccessToken(null)
  }

  const canGoNext = 
    flowStep !== 'idle' && 
    flowStep !== 'zoom_responds'

  const canGoPrevious = 
    flowStep !== 'idle'

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
              onClick={handlePreviousStep}
              disabled={!canGoPrevious}
              size="lg"
              className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700 disabled:opacity-50 shadow-lg"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Previous
            </Button>
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
          Cross App Access (Identity Assertion Authorization Grant)
        </h2>
      </div>

      {/* Role Labels - Positioned above actor cards */}
      <div className="absolute left-[230px] top-[500px] z-50">
        <div className="bg-blue-600/90 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold border border-blue-400">
          Requesting App
        </div>
      </div>
      <div className="absolute left-[1280px] top-[500px] z-50">
        <div className="bg-purple-600/90 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold border border-purple-400">
          Resource App
        </div>
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
          {/* ID-JAG Explanation Box - Shows during Step 4 */}
          {flowStep === 'idp_issues_id_jag' && (
            <div className="absolute right-8 top-24 w-[420px] bg-green-900/95 border-2 border-green-500 p-5 rounded-lg shadow-2xl z-50 pointer-events-auto">
              <h3 className="text-lg font-bold text-green-300 mb-3 text-center flex items-center justify-center gap-2">
                <span className="text-xl">📜</span> Identity Assertion JWT (ID-JAG)
              </h3>
              <div className="space-y-2 text-sm text-neutral-100">
                <div className="bg-green-950/50 p-3 rounded">
                  <div className="font-semibold mb-1">What is ID-JAG?</div>
                  <div className="text-xs text-neutral-300">
                    A signed JWT from the IdP that authorizes the agent to access a specific resource server on behalf of the user
                  </div>
                </div>
                <div className="bg-green-950/50 p-3 rounded">
                  <div className="font-semibold mb-1">Key Claims</div>
                  <div className="text-xs text-neutral-300 space-y-1">
                    <div><span className="font-mono">iss:</span> https://okta.example.com</div>
                    <div><span className="font-mono">aud:</span> https://zoom.example.com</div>
                    <div><span className="font-mono">client_id:</span> ai-agent-client-id</div>
                    <div><span className="font-mono">scope:</span> meetings.read recordings.read</div>
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
    </div>
  )
}
