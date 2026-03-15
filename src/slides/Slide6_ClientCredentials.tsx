import { useState, useMemo } from 'react'
import { Stage } from '@/stage/Stage'
import { SlideLayout } from '@/components/SlideLayout'
import { type HttpRequestEntry } from '@/components/HttpRequestPanel'
import { InsightsPanel, type InsightEntry } from '@/components/InsightsPanel'
import { HttpTerminalDrawer } from '@/components/HttpTerminalDrawer'
import { makeJwt } from '@/lib/tokens'
import { edgeColors } from '@/lib/colors'
import slideData from '@/data/slide6-client-credentials.json'

type FlowStep =
  | 'idle'
  | 'service_needs_access'
  | 'service_authenticates'
  | 'auth_server_validates'
  | 'token_issued'
  | 'api_call'
  | 'api_response'

const stepMetadata = slideData.steps as Record<FlowStep, { number: number; caption: string; why?: string; risk?: string } | null>

const FLOW_STEPS = slideData.flowSteps as FlowStep[]

/**
 * Slide 6: Client Credentials Grant
 * Machine-to-machine authentication — no user involved.
 * The simplest OAuth flow: service authenticates with its own credentials.
 */
export function Slide6_ClientCredentials() {
  const [flowStep, setFlowStep] = useState<FlowStep>('idle')

  const [accessToken] = useState(() =>
    makeJwt({
      sub: 'billing-service',
      iss: 'https://auth.example.com',
      aud: 'https://api.example.com',
      scope: 'invoices.read invoices.create',
      client_id: 'billing-service-id',
    }),
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

    if (reached('service_authenticates')) {
      entries.push({
        id: 'token-request',
        stepId: 'service_authenticates',
        label: 'POST /oauth/token',
        method: 'POST',
        url: 'https://auth.example.com/oauth/token',
        headers: [
          { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
          {
            name: 'Authorization',
            value: 'Basic YmlsbGluZy1zZXJ2aWNlLWlkOmJpbGxpbmctc2VjcmV0',
          },
        ],
        body: {
          grant_type: 'client_credentials',
          scope: 'invoices.read invoices.create',
        },
        response: reached('token_issued')
          ? {
              status: 200,
              statusText: 'OK',
              headers: [
                { name: 'Content-Type', value: 'application/json' },
                { name: 'Cache-Control', value: 'no-store' },
              ],
              body: {
                access_token: accessToken,
                token_type: 'Bearer',
                expires_in: '3600',
                scope: 'invoices.read invoices.create',
              },
            }
          : {
              status: 0,
              statusText: 'Pending...',
              headers: [],
              body: null,
            },
        color: edgeColors.auth,
      })
    }

    if (reached('api_call')) {
      entries.push({
        id: 'api-request',
        stepId: 'api_call',
        label: 'GET /v1/invoices',
        method: 'GET',
        url: 'https://api.example.com/v1/invoices',
        headers: [
          { name: 'Authorization', value: `Bearer ${accessToken.substring(0, 25)}...` },
          { name: 'Host', value: 'api.example.com' },
        ],
        response: reached('api_response')
          ? {
              status: 200,
              statusText: 'OK',
              headers: [{ name: 'Content-Type', value: 'application/json' }],
              body: {
                invoices: [
                  { id: 'INV-001', amount: '$2,400.00', status: 'paid' },
                  { id: 'INV-002', amount: '$1,800.00', status: 'pending' },
                ],
              },
            }
          : { status: 0, statusText: 'Pending...', headers: [], body: null },
        color: edgeColors.api,
      })
    }

    return entries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowStep])

  const handleStart = () => setFlowStep('service_needs_access')

  const handleNext = () => {
    const nextIndex = stepIndex + 1
    if (nextIndex < FLOW_STEPS.length) setFlowStep(FLOW_STEPS[nextIndex])
  }

  const handlePrevious = () => {
    if (stepIndex > 1) setFlowStep(FLOW_STEPS[stepIndex - 1])
  }

  const handleReset = () => setFlowStep('idle')

  const canGoNext = flowStep !== 'idle' && flowStep !== 'api_response'
  const canGoPrevious = flowStep !== 'idle' && flowStep !== 'service_needs_access'

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
