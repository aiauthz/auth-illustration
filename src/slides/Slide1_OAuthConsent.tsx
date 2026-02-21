import { useState, useEffect } from 'react'
import { Stage } from '@/stage/Stage'
import { TokenChip } from '@/components/TokenChip'
import { LoginDialog } from '@/components/LoginDialog'
import { ValidationIndicatorPositioned } from '@/components/ValidationIndicatorPositioned'
import { SlideLayout } from '@/components/SlideLayout'
import { makeJwt } from '@/lib/tokens'
import { edgeColors } from '@/lib/colors'

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

          {/* ID Token Display - positioned absolutely within Stage */}
          {flowStep === 'tokens_received' && idToken && (
            <div className="absolute right-8 bottom-8 w-[420px] bg-neutral-900/95 p-6 rounded-lg shadow-2xl border border-neutral-800 z-50 pointer-events-auto">
              <h3 className="text-xl font-semibold text-center mb-4 text-neutral-100">Login Complete</h3>
              <div className="flex flex-col gap-4">
                <TokenChip
                  label="ID Token"
                  value={idToken}
                  scopes={['profile.email']}
                />
                <div className="text-xs text-neutral-400 mt-2 text-center">
                  Authenticated as: <span className="font-mono text-neutral-300">{username || 'user@example.com'}</span>
                </div>
              </div>
            </div>
          )}
        </Stage>
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
