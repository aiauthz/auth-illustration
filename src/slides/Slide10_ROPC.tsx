import { useState, useMemo } from 'react'
import { Stage } from '@/stage/Stage'
import { LoginDialog } from '@/components/LoginDialog'
import { SlideLayout } from '@/components/SlideLayout'
import { type HttpRequestEntry } from '@/components/HttpRequestPanel'
import { InsightsPanel, type InsightEntry } from '@/components/InsightsPanel'
import { HttpTerminalDrawer } from '@/components/HttpTerminalDrawer'
import { makeJwt } from '@/lib/tokens'
import { edgeColors } from '@/lib/colors'
import slideData from '@/data/slide10-ropc.json'

type FlowStep =
  | 'idle'
  | 'app_asks_password'
  | 'user_enters_credentials'
  | 'app_sends_to_auth'
  | 'auth_validates'
  | 'tokens_issued'
  | 'app_calls_api'
  | 'security_problems'

const stepMetadata = slideData.steps as Record<
  FlowStep,
  { number: number; caption: string; why?: string; risk?: string } | null
>

const FLOW_STEPS = slideData.flowSteps as FlowStep[]

/**
 * Slide 10: Resource Owner Password Credentials (DEPRECATED)
 * Shows the direct password flow and explains why it's dangerous.
 * The app sees the user's password — defeating the purpose of OAuth.
 */
export function Slide10_ROPC() {
  const [flowStep, setFlowStep] = useState<FlowStep>('idle')
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [username, setUsername] = useState('user@example.com')

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

    if (reached('app_sends_to_auth')) {
      entries.push({
        id: 'password-grant',
        stepId: 'app_sends_to_auth',
        label: 'POST /oauth/token (password)',
        method: 'POST',
        url: 'https://auth.example.com/oauth/token',
        headers: [
          { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
        ],
        body: {
          grant_type: 'password',
          username,
          password: '••••••••',
          client_id: 'legacy-app-id',
          client_secret: 'legacy-app-secret',
          scope: 'openid profile email',
        },
        response: reached('tokens_issued')
          ? {
              status: 200,
              statusText: 'OK',
              headers: [
                { name: 'Content-Type', value: 'application/json' },
                { name: 'Cache-Control', value: 'no-store' },
              ],
              body: {
                access_token: accessToken,
                refresh_token: 'rt_legacy_xxxxxxxxxxxxx',
                token_type: 'Bearer',
                expires_in: '3600',
                scope: 'openid profile email',
              },
            }
          : { status: 0, statusText: 'Pending...', headers: [], body: null },
        color: edgeColors.error,
      })
    }

    if (reached('app_calls_api')) {
      entries.push({
        id: 'api-call-ropc',
        stepId: 'app_calls_api',
        label: 'GET /api/profile',
        method: 'GET',
        url: 'https://api.example.com/v1/profile',
        headers: [
          { name: 'Authorization', value: `Bearer ${accessToken.substring(0, 25)}...` },
        ],
        response: {
          status: 200,
          statusText: 'OK',
          headers: [{ name: 'Content-Type', value: 'application/json' }],
          body: { id: 'user-123', name: 'Alice', email: 'alice@example.com' },
        },
        color: edgeColors.api,
      })
    }

    return entries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowStep])

  const handleStart = () => setFlowStep('app_asks_password')
  const handleNext = () => {
    const next = FLOW_STEPS[stepIndex + 1]
    if (next === 'user_enters_credentials') {
      setShowLoginDialog(true)
    }
    if (next) setFlowStep(next)
  }
  const handlePrevious = () => {
    if (flowStep === 'user_enters_credentials') setShowLoginDialog(false)
    if (stepIndex > 1) setFlowStep(FLOW_STEPS[stepIndex - 1])
  }
  const handleLogin = (enteredUsername: string, _password: string) => {
    setUsername(enteredUsername || 'user@example.com')
    setShowLoginDialog(false)
    setFlowStep('app_sends_to_auth')
  }
  const handleReset = () => {
    setFlowStep('idle')
    setShowLoginDialog(false)
  }

  const canGoNext =
    flowStep !== 'idle' &&
    flowStep !== 'user_enters_credentials' &&
    flowStep !== 'security_problems'
  const canGoPrevious = flowStep !== 'idle' && flowStep !== 'app_asks_password'

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

      <LoginDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        onLogin={handleLogin}
        title={slideData.loginDialog.title}
        description={slideData.loginDialog.description}
      />
    </SlideLayout>
  )
}
