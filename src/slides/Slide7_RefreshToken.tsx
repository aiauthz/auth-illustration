import { useState, useMemo } from 'react'
import { Stage } from '@/stage/Stage'
import { SlideLayout } from '@/components/SlideLayout'
import { type HttpRequestEntry } from '@/components/HttpRequestPanel'
import { InsightsPanel, type InsightEntry } from '@/components/InsightsPanel'
import { HttpTerminalDrawer } from '@/components/HttpTerminalDrawer'
import { makeJwt } from '@/lib/tokens'
import { edgeColors } from '@/lib/colors'
import slideData from '@/data/slide7-refresh-token.json'

type FlowStep =
  | 'idle'
  | 'initial_auth_complete'
  | 'access_token_expires'
  | 'app_sends_refresh'
  | 'auth_validates_refresh'
  | 'new_tokens_issued'
  | 'app_calls_api'
  | 'api_responds'

const stepMetadata = slideData.steps as Record<
  FlowStep,
  { number: number; caption: string; why?: string; risk?: string } | null
>

const FLOW_STEPS = slideData.flowSteps as FlowStep[]

/**
 * Slide 7: Refresh Token Flow
 * Shows how applications silently renew access tokens using refresh tokens,
 * including token rotation for security.
 */
export function Slide7_RefreshToken() {
  const [flowStep, setFlowStep] = useState<FlowStep>('idle')

  const [oldAccessToken] = useState(() =>
    makeJwt({ sub: 'user@example.com', scope: 'openid profile', exp: Math.floor(Date.now() / 1000) - 60 }),
  )
  const [newAccessToken] = useState(() =>
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

    if (reached('access_token_expires')) {
      entries.push({
        id: 'expired-call',
        stepId: 'access_token_expires',
        label: 'GET /api/data (401)',
        method: 'GET',
        url: 'https://api.example.com/v1/data',
        headers: [
          { name: 'Authorization', value: `Bearer ${oldAccessToken.substring(0, 25)}...` },
        ],
        response: {
          status: 401,
          statusText: 'Unauthorized',
          headers: [{ name: 'WWW-Authenticate', value: 'Bearer error="invalid_token", error_description="Token has expired"' }],
          body: { error: 'invalid_token', error_description: 'The access token has expired' },
        },
        color: edgeColors.error,
      })
    }

    if (reached('app_sends_refresh')) {
      entries.push({
        id: 'refresh-request',
        stepId: 'app_sends_refresh',
        label: 'POST /oauth/token (refresh)',
        method: 'POST',
        url: 'https://auth.example.com/oauth/token',
        headers: [
          { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
          { name: 'Authorization', value: 'Basic Y2xpZW50LWlkOmNsaWVudC1zZWNyZXQ=' },
        ],
        body: {
          grant_type: 'refresh_token',
          refresh_token: 'rt_dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...',
          scope: 'openid profile',
        },
        response: reached('new_tokens_issued')
          ? {
              status: 200,
              statusText: 'OK',
              headers: [
                { name: 'Content-Type', value: 'application/json' },
                { name: 'Cache-Control', value: 'no-store' },
              ],
              body: {
                access_token: newAccessToken,
                refresh_token: 'rt_NEW_bmV3IHJlZnJlc2ggdG9rZW4...',
                token_type: 'Bearer',
                expires_in: '3600',
                scope: 'openid profile',
              },
            }
          : { status: 0, statusText: 'Pending...', headers: [], body: null },
        color: edgeColors.token,
      })
    }

    if (reached('app_calls_api')) {
      entries.push({
        id: 'retry-call',
        stepId: 'app_calls_api',
        label: 'GET /api/data (retry)',
        method: 'GET',
        url: 'https://api.example.com/v1/data',
        headers: [
          { name: 'Authorization', value: `Bearer ${newAccessToken.substring(0, 25)}...` },
        ],
        response: reached('api_responds')
          ? {
              status: 200,
              statusText: 'OK',
              headers: [{ name: 'Content-Type', value: 'application/json' }],
              body: { data: [{ id: 1, name: 'User Dashboard' }] },
            }
          : { status: 0, statusText: 'Pending...', headers: [], body: null },
        color: edgeColors.api,
      })
    }

    return entries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowStep])

  const handleStart = () => setFlowStep('initial_auth_complete')
  const handleNext = () => {
    const nextIndex = stepIndex + 1
    if (nextIndex < FLOW_STEPS.length) setFlowStep(FLOW_STEPS[nextIndex])
  }
  const handlePrevious = () => {
    if (stepIndex > 1) setFlowStep(FLOW_STEPS[stepIndex - 1])
  }
  const handleReset = () => setFlowStep('idle')

  const canGoNext = flowStep !== 'idle' && flowStep !== 'api_responds'
  const canGoPrevious = flowStep !== 'idle' && flowStep !== 'initial_auth_complete'

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
