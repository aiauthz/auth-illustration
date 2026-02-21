import { useState, useEffect, useMemo } from 'react'
import { Stage } from '@/stage/Stage'
import { LoginDialog } from '@/components/LoginDialog'
import { ValidationIndicatorPositioned } from '@/components/ValidationIndicatorPositioned'
import { SlideLayout } from '@/components/SlideLayout'
import { HttpRequestPanel, type HttpRequestEntry } from '@/components/HttpRequestPanel'
import { makeJwt } from '@/lib/tokens'
import { edgeColors } from '@/lib/colors'
import { Terminal, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type FlowStep =
  | 'idle'
  | 'user_clicks_login'
  | 'auth_request'
  | 'login_shown'
  | 'idp_validates'
  | 'tokens_received'

// Step metadata for captions and sequence numbers
const stepMetadata: Record<FlowStep, { number: number; caption: string } | null> = {
  idle: null,
  user_clicks_login: {
    number: 1,
    caption: 'User clicks "Sign in" - User wants to access Google Calendar and clicks the login button to start the authentication process',
  },
  auth_request: {
    number: 2,
    caption: 'Calendar app initiates SSO - Calendar redirects to Okta with client_id, redirect_uri, and state parameters',
  },
  login_shown: {
    number: 3,
    caption: 'Okta presents login screen - User enters their username and password to authenticate with the Identity Provider',
  },
  idp_validates: {
    number: 4,
    caption: 'IDP validates user identity - Okta verifies the user credentials and validates their identity',
  },
  tokens_received: {
    number: 5,
    caption: 'Authentication complete - Calendar app receives ID token containing user identity information and can now authenticate the user',
  },
}

const FLOW_STEPS: FlowStep[] = [
  'idle',
  'user_clicks_login',
  'auth_request',
  'login_shown',
  'idp_validates',
  'tokens_received',
]

/**
 * Slide 1: Basic OIDC Authentication Flow
 * Full-screen Stage-based layout
 * Shows simplified login flow: SSO -> username/password -> IDP validates -> ID token
 * Each step is shown individually for presenter mode
 */
export function Slide1_OAuthConsent() {
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [flowStep, setFlowStep] = useState<FlowStep>('idle')
  const [idToken, setIdToken] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [isValidated, setIsValidated] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)

  const stepIndex = FLOW_STEPS.indexOf(flowStep)
  const reached = (step: FlowStep) => stepIndex >= FLOW_STEPS.indexOf(step)

  const httpEntries: HttpRequestEntry[] = useMemo(() => {
    const entries: HttpRequestEntry[] = []

    if (reached('auth_request')) {
      entries.push({
        id: 'authorize',
        stepId: 'auth_request',
        label: 'GET /authorize (OIDC SSO redirect)',
        method: 'GET',
        url: 'https://okta.example.com/authorize',
        headers: [],
        queryParams: {
          response_type: 'code',
          client_id: 'google-calendar-client-id',
          redirect_uri: 'https://calendar.example.com/callback',
          scope: 'openid profile email',
          state: 'xyz123',
          code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
          code_challenge_method: 'S256',
        },
        response: {
          status: 302,
          statusText: 'Found',
          headers: [
            {
              name: 'Location',
              value: 'https://okta.example.com/login?session=abc',
            },
          ],
          body: null,
        },
        color: edgeColors.auth,
      })
    }

    if (reached('tokens_received')) {
      entries.push({
        id: 'token-exchange',
        stepId: 'tokens_received',
        label: 'POST /oauth/token (token exchange)',
        method: 'POST',
        url: 'https://okta.example.com/oauth/token',
        headers: [
          { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
        ],
        body: {
          grant_type: 'authorization_code',
          code: 'auth_code_xxx',
          redirect_uri: 'https://calendar.example.com/callback',
          client_id: 'google-calendar-client-id',
          client_secret: 'calendar-app-secret',
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
            access_token: 'eyJhbGciOiJSUzI1...',
            token_type: 'Bearer',
            expires_in: 3600,
          },
        },
        color: edgeColors.idToken,
      })
    }

    return entries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowStep])

  const nodes = [
    { id: 'user', x: 64, y: 240, w: 220 },
    { id: 'calendar', x: 480, y: 240, w: 260 },
    { id: 'okta', x: 1000, y: 240, w: 240 },
  ]

  const edges = [
    {
      id: 'user-to-calendar',
      from: 'user',
      to: 'calendar',
      label: 'Clicks "Sign in"',
      color: edgeColors.authBright,
      pulse: flowStep === 'user_clicks_login',
      visible: flowStep === 'user_clicks_login',
    },
    {
      id: 'calendar-to-okta',
      from: 'calendar',
      to: 'okta',
      label: 'SSO (OIDC)',
      color: edgeColors.auth,
      pulse: flowStep === 'auth_request',
      visible: flowStep === 'auth_request',
    },
    {
      id: 'okta-to-calendar-token',
      from: 'okta',
      to: 'calendar',
      label: 'ID Token',
      color: edgeColors.idToken,
      pulse: flowStep === 'tokens_received',
      visible: flowStep === 'tokens_received',
    },
  ]

  const handleStartOAuth = () => {
    setFlowStep('user_clicks_login')
  }

  const handleNextStep = () => {
    switch (flowStep) {
      case 'idle':
        handleStartOAuth()
        break
      case 'user_clicks_login':
        setFlowStep('auth_request')
        break
      case 'auth_request':
        setFlowStep('login_shown')
        setShowLoginDialog(true)
        break
      case 'login_shown':
        break
      case 'idp_validates': {
        const newIdToken = makeJwt({
          sub: username || 'user@example.com',
          email: username || 'user@example.com',
          iss: 'https://okta.example.com',
          aud: 'google-calendar-client-id',
        })
        setIdToken(newIdToken)
        setFlowStep('tokens_received')
        break
      }
      case 'tokens_received':
        break
    }
  }

  const handlePreviousStep = () => {
    switch (flowStep) {
      case 'tokens_received':
        setIdToken(null)
        setIsValidated(true)
        setFlowStep('idp_validates')
        break
      case 'idp_validates':
        setIsValidated(false)
        setFlowStep('login_shown')
        setShowLoginDialog(true)
        break
      case 'login_shown':
        setShowLoginDialog(false)
        setFlowStep('auth_request')
        break
      case 'auth_request':
        setFlowStep('user_clicks_login')
        break
      case 'user_clicks_login':
        setFlowStep('idle')
        break
    }
  }

  const handleLogin = (enteredUsername: string, _password: string) => {
    setUsername(enteredUsername)
    setShowLoginDialog(false)
    setIsValidated(false)
    setFlowStep('idp_validates')
  }

  const handleReset = () => {
    setFlowStep('idle')
    setIdToken(null)
    setUsername(null)
    setShowLoginDialog(false)
    setIsValidated(false)
  }

  const canGoNext =
    flowStep !== 'idle' &&
    flowStep !== 'login_shown' &&
    flowStep !== 'tokens_received'

  const canGoPrevious =
    flowStep !== 'idle'

  // Auto-validate after showing validation spinner
  useEffect(() => {
    if (flowStep === 'idp_validates' && !isValidated) {
      const timer = setTimeout(() => {
        setIsValidated(true)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [flowStep, isValidated])

  return (
    <SlideLayout
      title="Basic OIDC Authentication Flow"
      flowStep={flowStep}
      stepMetadata={stepMetadata}
      onStart={handleStartOAuth}
      onNext={handleNextStep}
      onPrevious={handlePreviousStep}
      onReset={handleReset}
      canGoNext={canGoNext}
      canGoPrevious={canGoPrevious}
      startLabel="Start OAuth Flow"
    >
      {/* Full-screen Stage */}
      <div className="w-full h-full">
        <Stage nodes={nodes} edges={edges} className="w-full h-full">
          {/* IDP Validation Indicator - positioned directly above Okta node */}
          {flowStep === 'idp_validates' && (
            <ValidationIndicatorPositioned isValidated={isValidated} nodeId="okta" />
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

      {/* Login Dialog */}
      <LoginDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        onLogin={handleLogin}
      />
    </SlideLayout>
  )
}
