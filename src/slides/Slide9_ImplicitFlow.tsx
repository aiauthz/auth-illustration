import { useState, useMemo } from 'react'
import { Stage } from '@/stage/Stage'
import { SlideLayout } from '@/components/SlideLayout'
import { type HttpRequestEntry } from '@/components/HttpRequestPanel'
import { InsightsPanel, type InsightEntry } from '@/components/InsightsPanel'
import { HttpTerminalDrawer } from '@/components/HttpTerminalDrawer'
import { makeJwt } from '@/lib/tokens'
import { edgeColors } from '@/lib/colors'
import slideData from '@/data/slide9-implicit-flow.json'

type FlowStep =
  | 'idle'
  | 'spa_redirects'
  | 'user_authenticates'
  | 'auth_returns_token_in_fragment'
  | 'spa_extracts_token'
  | 'spa_calls_api'
  | 'api_response'
  | 'security_problems'

const stepMetadata = slideData.steps as Record<
  FlowStep,
  { number: number; caption: string; why?: string; risk?: string } | null
>

const FLOW_STEPS = slideData.flowSteps as FlowStep[]

/**
 * Slide 9: Implicit Grant (DEPRECATED)
 * Shows the flow and then explains why it's insecure.
 * Educational — demonstrating what NOT to do is as important as what TO do.
 */
export function Slide9_ImplicitFlow() {
  const [flowStep, setFlowStep] = useState<FlowStep>('idle')

  const [accessToken] = useState(() =>
    makeJwt({ sub: 'user@example.com', scope: 'openid profile', iss: 'https://auth.example.com' }),
  )

  const stepIndex = FLOW_STEPS.indexOf(flowStep)
  const reached = (step: FlowStep) => stepIndex >= FLOW_STEPS.indexOf(step)

  const nodes = slideData.nodes

  const edges = slideData.edges.map((e) => ({
    ...e,
    color: edgeColors[e.colorKey as keyof typeof edgeColors],
    pulse: e.pulseOn === flowStep,
    visible: e.visibleOn.includes(flowStep),
  }))

  const httpEntries: HttpRequestEntry[] = useMemo(() => {
    const entries: HttpRequestEntry[] = []

    if (reached('spa_redirects')) {
      entries.push({
        id: 'authorize-implicit',
        stepId: 'spa_redirects',
        label: 'GET /authorize (implicit)',
        method: 'GET',
        url: 'https://auth.example.com/authorize',
        headers: [],
        queryParams: {
          response_type: 'token',
          client_id: 'spa-client-id',
          redirect_uri: 'https://app.example.com/callback',
          scope: 'openid profile',
          state: 'xyz123',
          nonce: 'abc456',
        },
        response: {
          status: 302,
          statusText: 'Found',
          headers: [{ name: 'Location', value: 'https://auth.example.com/login?...' }],
          body: null,
        },
        color: edgeColors.auth,
      })
    }

    if (reached('auth_returns_token_in_fragment')) {
      entries.push({
        id: 'callback-fragment',
        stepId: 'auth_returns_token_in_fragment',
        label: 'GET /callback#access_token=...',
        method: 'GET',
        url: 'https://app.example.com/callback',
        headers: [{ name: 'Host', value: 'app.example.com' }],
        queryParams: {
          '(URL Fragment - NOT sent to server)': '',
          '#access_token': accessToken.substring(0, 30) + '...',
          token_type: 'Bearer',
          expires_in: '3600',
          scope: 'openid profile',
          state: 'xyz123',
        },
        response: {
          status: 200,
          statusText: 'OK',
          headers: [{ name: 'Content-Type', value: 'text/html' }],
          body: null,
        },
        color: edgeColors.error,
      })
    }

    if (reached('spa_calls_api')) {
      entries.push({
        id: 'api-call-implicit',
        stepId: 'spa_calls_api',
        label: 'GET /api/profile',
        method: 'GET',
        url: 'https://api.example.com/v1/profile',
        headers: [
          { name: 'Authorization', value: `Bearer ${accessToken.substring(0, 25)}...` },
        ],
        response: reached('api_response')
          ? {
              status: 200,
              statusText: 'OK',
              headers: [{ name: 'Content-Type', value: 'application/json' }],
              body: { id: 'user-123', name: 'Alice', email: 'alice@example.com' },
            }
          : { status: 0, statusText: 'Pending...', headers: [], body: null },
        color: edgeColors.api,
      })
    }

    return entries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowStep])

  const handleStart = () => setFlowStep('spa_redirects')
  const handleNext = () => {
    const nextIndex = stepIndex + 1
    if (nextIndex < FLOW_STEPS.length) setFlowStep(FLOW_STEPS[nextIndex])
  }
  const handlePrevious = () => {
    if (stepIndex > 1) setFlowStep(FLOW_STEPS[stepIndex - 1])
  }
  const handleReset = () => setFlowStep('idle')

  const canGoNext = flowStep !== 'idle' && flowStep !== 'security_problems'
  const canGoPrevious = flowStep !== 'idle' && flowStep !== 'spa_redirects'

  const insightEntries = slideData.insights as InsightEntry[]

  return (
    <SlideLayout
      title={slideData.title}
      flowStep={flowStep}
      stepMetadata={stepMetadata}
      onStart={handleStart}
      onNext={handleNext}
      onPrevious={handlePrevious}
      onReset={handleReset}
      canGoNext={canGoNext}
      canGoPrevious={canGoPrevious}
      startLabel={slideData.startLabel}
    >
      <div className="w-full h-full">
        <Stage nodes={nodes} edges={edges} className="w-full h-full" />
      </div>

      <InsightsPanel entries={insightEntries} activeStepId={flowStep} />
      <HttpTerminalDrawer entries={httpEntries} activeStepId={flowStep} />
    </SlideLayout>
  )
}
