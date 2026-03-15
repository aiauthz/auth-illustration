import { useState, useEffect, useMemo } from 'react'
import { Stage } from '@/stage/Stage'
import { SlideLayout } from '@/components/SlideLayout'
import { type HttpRequestEntry } from '@/components/HttpRequestPanel'
import { InsightsPanel, type InsightEntry } from '@/components/InsightsPanel'
import { HttpTerminalDrawer } from '@/components/HttpTerminalDrawer'
import { ValidationIndicatorPositioned } from '@/components/ValidationIndicatorPositioned'
import { makeJwt } from '@/lib/tokens'
import { edgeColors } from '@/lib/colors'
import slideData from '@/data/slide8-device-code.json'

type FlowStep =
  | 'idle'
  | 'device_requests_code'
  | 'device_receives_code'
  | 'device_shows_code'
  | 'user_visits_url'
  | 'user_enters_code'
  | 'user_grants_consent'
  | 'device_polls_pending'
  | 'device_polls_success'
  | 'device_authenticated'

const stepMetadata = slideData.steps as Record<
  FlowStep,
  { number: number; caption: string; why?: string; risk?: string } | null
>

const FLOW_STEPS = slideData.flowSteps as FlowStep[]

/**
 * Slide 8: Device Authorization Grant (RFC 8628)
 * For input-constrained devices: smart TVs, CLI tools, IoT.
 * Features a polling loop visualization.
 */
export function Slide8_DeviceCode() {
  const [flowStep, setFlowStep] = useState<FlowStep>('idle')
  const [isValidated, setIsValidated] = useState(false)
  const [pollCount, setPollCount] = useState(0)

  const [accessToken] = useState(() =>
    makeJwt({ sub: 'user@example.com', scope: 'repo read:user', client_id: 'gh-cli' }),
  )

  const stepIndex = FLOW_STEPS.indexOf(flowStep)
  const reached = (step: FlowStep) => stepIndex >= FLOW_STEPS.indexOf(step)

  const nodes = slideData.nodes

  const edges = slideData.edges.map((e) => ({
    ...e,
    color: edgeColors[e.colorKey as keyof typeof edgeColors],
    // For the poll edge, use dynamic label; for others, use JSON label
    label: e.id === 'device-to-auth-poll' ? `POST /token (poll #${pollCount + 1})` : e.label,
    dashed: 'dashed' in e ? e.dashed : undefined,
    pulse: 'alwaysPulse' in e && e.alwaysPulse ? true : (e.pulseOn === flowStep),
    visible: e.visibleOn.includes(flowStep),
  }))

  const httpEntries: HttpRequestEntry[] = useMemo(() => {
    const entries: HttpRequestEntry[] = []

    if (reached('device_requests_code')) {
      entries.push({
        id: 'device-authorize',
        stepId: 'device_requests_code',
        label: 'POST /device/authorize',
        method: 'POST',
        url: 'https://auth.example.com/device/authorize',
        headers: [{ name: 'Content-Type', value: 'application/x-www-form-urlencoded' }],
        body: {
          client_id: 'gh-cli-client-id',
          scope: 'repo read:user user:email',
        },
        response: reached('device_receives_code')
          ? {
              status: 200,
              statusText: 'OK',
              headers: [{ name: 'Content-Type', value: 'application/json' }],
              body: {
                device_code: 'GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS',
                user_code: 'WDJB-MJHT',
                verification_uri: 'https://auth.example.com/device',
                verification_uri_complete: 'https://auth.example.com/device?user_code=WDJB-MJHT',
                expires_in: '900',
                interval: '5',
              },
            }
          : { status: 0, statusText: 'Pending...', headers: [], body: null },
        color: edgeColors.auth,
      })
    }

    if (reached('device_polls_pending')) {
      entries.push({
        id: 'poll-pending',
        stepId: 'device_polls_pending',
        label: 'POST /token (pending)',
        method: 'POST',
        url: 'https://auth.example.com/oauth/token',
        headers: [{ name: 'Content-Type', value: 'application/x-www-form-urlencoded' }],
        body: {
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: 'GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS',
          client_id: 'gh-cli-client-id',
        },
        response: {
          status: 400,
          statusText: 'Bad Request',
          headers: [{ name: 'Content-Type', value: 'application/json' }],
          body: { error: 'authorization_pending', error_description: 'User has not yet completed authorization' },
        },
        color: edgeColors.error,
      })
    }

    if (reached('device_polls_success')) {
      entries.push({
        id: 'poll-success',
        stepId: 'device_polls_success',
        label: 'POST /token (success)',
        method: 'POST',
        url: 'https://auth.example.com/oauth/token',
        headers: [{ name: 'Content-Type', value: 'application/x-www-form-urlencoded' }],
        body: {
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: 'GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS',
          client_id: 'gh-cli-client-id',
        },
        response: {
          status: 200,
          statusText: 'OK',
          headers: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Cache-Control', value: 'no-store' },
          ],
          body: {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: '28800',
            scope: 'repo read:user user:email',
            refresh_token: 'rt_ghr_xxxxxxxxxxxx',
          },
        },
        color: edgeColors.success,
      })
    }

    return entries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowStep])

  const handleStart = () => setFlowStep('device_requests_code')
  const handleNext = () => {
    const next = FLOW_STEPS[stepIndex + 1]
    if (next === 'user_grants_consent') {
      setIsValidated(false)
    }
    if (next) setFlowStep(next)
  }
  const handlePrevious = () => {
    if (stepIndex > 1) setFlowStep(FLOW_STEPS[stepIndex - 1])
  }
  const handleReset = () => {
    setFlowStep('idle')
    setIsValidated(false)
    setPollCount(0)
  }

  const canGoNext = flowStep !== 'idle' && flowStep !== 'device_authenticated'
  const canGoPrevious = flowStep !== 'idle' && flowStep !== 'device_requests_code'

  // Auto-validate consent
  useEffect(() => {
    if (flowStep === 'user_grants_consent' && !isValidated) {
      const timer = setTimeout(() => setIsValidated(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [flowStep, isValidated])

  // Simulate poll count
  useEffect(() => {
    if (flowStep === 'device_polls_pending') {
      const timer = setInterval(() => {
        setPollCount((c) => c + 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [flowStep])

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
        <Stage nodes={nodes} edges={edges} className="w-full h-full">
          {flowStep === slideData.validation.step && (
            <ValidationIndicatorPositioned
              isValidated={isValidated}
              nodeId={slideData.validation.nodeId}
              validatingText={slideData.validation.validatingText}
              validatedText={slideData.validation.validatedText}
              validatingSubtext={slideData.validation.validatingSubtext}
              validatedSubtext={slideData.validation.validatedSubtext}
            />
          )}
        </Stage>
      </div>

      <InsightsPanel entries={insightEntries} activeStepId={flowStep} />
      <HttpTerminalDrawer entries={httpEntries} activeStepId={flowStep} />
    </SlideLayout>
  )
}
