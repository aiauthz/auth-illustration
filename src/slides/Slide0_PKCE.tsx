import { useState, useEffect, useMemo } from 'react'
import { Stage } from '@/stage/Stage'
import { LoginDialog } from '@/components/LoginDialog'
import { ValidationIndicatorPositioned } from '@/components/ValidationIndicatorPositioned'
import { SlideLayout } from '@/components/SlideLayout'
import { HttpRequestPanel, type HttpRequestEntry } from '@/components/HttpRequestPanel'
import { makePkceVerifier, makePkceChallenge, makeAuthCode, makeJwt } from '@/lib/tokens'
import { edgeColors } from '@/lib/colors'
import { Terminal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import slideData from '@/data/slide0-pkce.json'

type FlowStep =
  | 'idle'
  | 'intro_title'
  | 'intro_problem'
  | 'intro_actors'
  | 'user_clicks_login'
  | 'generate_pkce'
  | 'redirect_to_authorize'
  | 'user_authenticates'
  | 'auth_code_redirect'
  | 'spa_sends_to_backend'
  | 'backend_token_exchange'
  | 'auth_server_verifies'
  | 'tokens_returned'
  | 'spa_complete'
  | 'summary_security'
  | 'summary_takeaways'

import type { StepMeta } from '@/components/SlideLayout'

const stepMetadata = slideData.steps as Record<FlowStep, StepMeta | null>

const FLOW_STEPS = slideData.flowSteps as FlowStep[]

export function Slide0_PKCE() {
  const [flowStep, setFlowStep] = useState<FlowStep>('idle')
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [isValidated, setIsValidated] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)

  const [codeVerifier] = useState(() => makePkceVerifier())
  const [codeChallenge] = useState(() => makePkceChallenge())
  const [authCode] = useState(() => makeAuthCode())
  const [accessToken] = useState(() =>
    makeJwt({ sub: 'user@example.com', scope: 'openid profile email' }),
  )
  const [idToken] = useState(() =>
    makeJwt({
      sub: 'user@example.com',
      email: 'user@example.com',
      iss: 'https://auth.example.com',
    }),
  )

  const stepIndex = FLOW_STEPS.indexOf(flowStep)

  const nodes = slideData.nodes

  const reached = (step: FlowStep) => stepIndex >= FLOW_STEPS.indexOf(step)

  const edges = slideData.edges.map((e) => ({
    ...e,
    color: edgeColors[e.colorKey as keyof typeof edgeColors],
    pulse: e.pulseOn === flowStep,
    visible: e.visibleOn.includes(flowStep),
  }))

  const httpEntries: HttpRequestEntry[] = useMemo(() => {
    const entries: HttpRequestEntry[] = []

    if (reached('redirect_to_authorize')) {
      entries.push({
        id: 'authorize',
        stepId: 'redirect_to_authorize',
        label: '/authorize',
        method: 'GET',
        url: 'https://auth.example.com/authorize',
        headers: [{ name: 'Host', value: 'auth.example.com' }],
        queryParams: {
          response_type: 'code',
          client_id: 'spa-client-id',
          redirect_uri: 'https://app.example.com/callback',
          scope: 'openid profile email',
          state: 'xyzABC123',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        },
        response: {
          status: 302,
          statusText: 'Found',
          headers: [
            { name: 'Location', value: 'https://auth.example.com/login?...' },
          ],
          body: null,
        },
        color: edgeColors.auth,
      })
    }

    if (reached('auth_code_redirect')) {
      entries.push({
        id: 'callback',
        stepId: 'auth_code_redirect',
        label: '/callback',
        method: 'GET',
        url: 'https://app.example.com/callback',
        headers: [{ name: 'Host', value: 'app.example.com' }],
        queryParams: {
          code: authCode,
          state: 'xyzABC123',
        },
        response: {
          status: 200,
          statusText: 'OK',
          headers: [{ name: 'Content-Type', value: 'text/html' }],
          body: null,
        },
        color: edgeColors.consent,
      })
    }

    if (reached('spa_sends_to_backend')) {
      entries.push({
        id: 'api-callback',
        stepId: 'spa_sends_to_backend',
        label: '/api/auth/callback',
        method: 'POST',
        url: 'https://app.example.com/api/auth/callback',
        headers: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Host', value: 'app.example.com' },
        ],
        body: {
          code: authCode,
          code_verifier: codeVerifier,
        },
        response: {
          status: 200,
          statusText: 'OK',
          headers: [{ name: 'Content-Type', value: 'application/json' }],
          body: { status: 'processing' },
        },
        color: edgeColors.api,
      })
    }

    if (reached('backend_token_exchange')) {
      entries.push({
        id: 'token-exchange',
        stepId: 'backend_token_exchange',
        label: '/oauth/token',
        method: 'POST',
        url: 'https://auth.example.com/oauth/token',
        headers: [
          { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
          { name: 'Host', value: 'auth.example.com' },
        ],
        body: {
          grant_type: 'authorization_code',
          code: authCode,
          redirect_uri: 'https://app.example.com/callback',
          client_id: 'spa-client-id',
          code_verifier: codeVerifier,
        },
        response: reached('tokens_returned')
          ? {
              status: 200,
              statusText: 'OK',
              headers: [
                { name: 'Content-Type', value: 'application/json' },
                { name: 'Cache-Control', value: 'no-store' },
              ],
              body: {
                access_token: accessToken,
                id_token: idToken,
                refresh_token: 'rt_' + Math.random().toString(36).substring(2, 14),
                token_type: 'Bearer',
                expires_in: 3600,
                scope: 'openid profile email',
              },
            }
          : {
              status: 0,
              statusText: 'Pending...',
              headers: [],
              body: null,
            },
        color: edgeColors.token,
      })
    }

    return entries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowStep])

  const handleStart = () => setFlowStep('user_clicks_login')

  const handleNextStep = () => {
    const nextIndex = stepIndex + 1
    if (nextIndex < FLOW_STEPS.length) {
      const next = FLOW_STEPS[nextIndex]
      if (next === 'user_authenticates') {
        setShowLoginDialog(true)
      }
      if (next === 'auth_server_verifies') {
        setIsValidated(false)
      }
      setFlowStep(next)
    }
  }

  const handlePreviousStep = () => {
    if (stepIndex > 1) {
      const prev = FLOW_STEPS[stepIndex - 1]
      if (flowStep === 'user_authenticates') {
        setShowLoginDialog(false)
      }
      if (prev === 'user_authenticates') {
        setShowLoginDialog(true)
      }
      setFlowStep(prev)
    }
  }

  const handleLogin = (_username: string, _password: string) => {
    setShowLoginDialog(false)
    setFlowStep('auth_code_redirect')
  }

  const handleReset = () => {
    setFlowStep('idle')
    setShowLoginDialog(false)
    setIsValidated(false)
  }

  const canGoNext =
    flowStep !== 'idle' &&
    flowStep !== 'user_authenticates' &&
    flowStep !== 'summary_takeaways'

  const canGoPrevious = flowStep !== 'idle' && flowStep !== 'user_clicks_login'

  // Auto-validate after showing validation spinner
  useEffect(() => {
    if (flowStep === 'auth_server_verifies' && !isValidated) {
      const timer = setTimeout(() => {
        setIsValidated(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [flowStep, isValidated])

  return (
    <SlideLayout
      title={slideData.title}
      flowStep={flowStep}
      stepMetadata={stepMetadata}
      onStart={handleStart}
      onNext={handleNextStep}
      onPrevious={handlePreviousStep}
      onReset={handleReset}
      canGoNext={canGoNext}
      canGoPrevious={canGoPrevious}
      startLabel={slideData.startLabel}
    >
      {/* Full-screen Stage */}
      <div className="w-full h-full">
        <Stage nodes={nodes} edges={edges} className="w-full h-full">
          {/* Validation indicator on step 8 */}
          {flowStep === 'auth_server_verifies' && (
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

      {/* Terminal toggle button — top right */}
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

      {/* Terminal drawer — slides up from bottom */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out',
          showTerminal ? 'translate-y-0' : 'translate-y-full',
        )}
        style={{ height: '45%' }}
      >
        <div className="w-full h-full bg-neutral-950 border-t border-neutral-700 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] flex flex-col">
          {/* Drawer header */}
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
          {/* Panel content */}
          <div className="flex-1 min-h-0">
            <HttpRequestPanel entries={httpEntries} activeStepId={flowStep} />
          </div>
        </div>
      </div>

      <LoginDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        onLogin={handleLogin}
      />
    </SlideLayout>
  )
}
