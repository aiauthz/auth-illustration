import { useState, useEffect, useMemo } from 'react'
import { Stage } from '@/stage/Stage'
import { ValidationIndicatorPositioned } from '@/components/ValidationIndicatorPositioned'
import { SlideLayout } from '@/components/SlideLayout'
import { HttpRequestPanel, type HttpRequestEntry } from '@/components/HttpRequestPanel'
import { makeJwt } from '@/lib/tokens'
import { edgeColors } from '@/lib/colors'
import { InsightsPanel, type InsightEntry } from '@/components/InsightsPanel'
import { Terminal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import slideData from '@/data/slide5-cross-app-access.json'

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

const stepMetadata = slideData.steps as Record<FlowStep, { number: number; caption: string; why?: string; risk?: string } | null>

const FLOW_STEPS = slideData.flowSteps as FlowStep[]

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
        url: 'https://idp.example.com/authorize',
        headers: [{ name: 'Host', value: 'idp.example.com' }],
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
            { name: 'Location', value: 'https://idp.example.com/login?...' },
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
        url: 'https://idp.example.com/oauth/token',
        headers: [
          { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
          { name: 'Host', value: 'idp.example.com' },
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
        url: 'https://idp.example.com/oauth/token',
        headers: [
          { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
          { name: 'Host', value: 'idp.example.com' },
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodes = slideData.nodes as any[]

  const edges = slideData.edges.map((e) => ({
    ...e,
    color: edgeColors[e.colorKey as keyof typeof edgeColors],
    pulse: e.alwaysVisible ? false : e.pulseOn === flowStep,
    visible: e.alwaysVisible ? true : (e.visibleOn ?? []).includes(flowStep),
  }))

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
          iss: 'https://idp.example.com',
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
          iss: 'https://idp.example.com',
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

  const insightEntries = slideData.insights as InsightEntry[]

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
      title={slideData.title}
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
          {/* IDP Validation Indicator - positioned above IdP node */}
          {flowStep === 'agent_sso' && (
            <ValidationIndicatorPositioned isValidated={isValidated} nodeId="idp" position="top" />
          )}

        </Stage>
      </div>

      <InsightsPanel entries={insightEntries} activeStepId={flowStep} />

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
