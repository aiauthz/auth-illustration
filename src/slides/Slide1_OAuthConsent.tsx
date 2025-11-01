import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Stage } from '@/stage/Stage'
import { TokenChip } from '@/components/TokenChip'
import { ConsentDialog } from '@/components/ConsentDialog'
import { LoginDialog } from '@/components/LoginDialog'
import { AnimatedToken } from '@/components/AnimatedToken'
import { makeJwt } from '@/lib/tokens'
import { Play, RotateCcw, ArrowRight } from 'lucide-react'

type FlowStep =
  | 'idle'
  | 'auth_request'
  | 'login_shown'
  | 'login_complete'
  | 'consent_shown'
  | 'code_received'
  | 'token_exchange'
  | 'tokens_received'

// Step metadata for captions and sequence numbers
const stepMetadata: Record<FlowStep, { number: number; caption: string } | null> = {
  idle: null,
  auth_request: {
    number: 1,
    caption: 'User clicks login - Calendar app initiates OAuth flow by redirecting to Okta with client_id, redirect_uri, scopes, and state parameters',
  },
  login_shown: {
    number: 2,
    caption: 'Okta presents login screen - User enters their username and password to authenticate with the Identity Provider',
  },
  login_complete: {
    number: 3,
    caption: 'User submits credentials - Username and password are verified by Okta, establishing the user\'s identity',
  },
  consent_shown: {
    number: 4,
    caption: 'Authorization consent - Okta asks user to grant Calendar app permission to access their profile information',
  },
  code_received: {
    number: 5,
    caption: 'User grants consent - Okta redirects back to Calendar app with a one-time authorization code',
  },
  token_exchange: {
    number: 6,
    caption: 'Token exchange - Calendar app exchanges authorization code for tokens by sending it to Okta with client_secret',
  },
  tokens_received: {
    number: 7,
    caption: 'Authentication complete - Calendar app receives ID token containing user identity information and can now authenticate the user',
  },
}

/**
 * Slide 1: User OAuth Consent with Okta (IDP)
 * Full-screen Stage-based layout
 * Shows login flow: username/password -> consent -> ID token only
 * Each step is shown individually for presenter mode
 */
export function Slide1_OAuthConsent() {
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [showConsentDialog, setShowConsentDialog] = useState(false)
  const [flowStep, setFlowStep] = useState<FlowStep>('idle')
  const [idToken, setIdToken] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)

  const nodes = [
    { id: 'user', x: 64, y: 240, w: 220 },
    { id: 'calendar', x: 400, y: 240, w: 260 },
    { id: 'okta', x: 920, y: 240, w: 240 }, // Increased distance from 800 to 920
  ]

  // Each arrow is visible only at its specific step - no overlapping
  const edges = [
    {
      id: 'calendar-to-okta',
      from: 'calendar',
      to: 'okta',
      label: 'Auth Request (client_id, redirect_uri, scopes, state)',
      color: '#60a5fa', // Blue
      pulse: flowStep === 'auth_request',
      visible: flowStep === 'auth_request', // Only visible at this step
    },
    {
      id: 'okta-to-calendar-code',
      from: 'okta',
      to: 'calendar',
      label: 'Authorization Code',
      color: '#10b981', // Green
      pulse: flowStep === 'code_received',
      visible: flowStep === 'code_received', // Only visible at this step
    },
    {
      id: 'calendar-to-okta-token',
      from: 'calendar',
      to: 'okta',
      label: 'Token Exchange (code + client_secret)',
      color: '#8b5cf6', // Purple
      pulse: flowStep === 'token_exchange',
      visible: flowStep === 'token_exchange', // Only visible at this step
    },
    {
      id: 'okta-to-calendar-tokens',
      from: 'okta',
      to: 'calendar',
      label: 'ID Token',
      color: '#ec4899', // Pink
      pulse: flowStep === 'tokens_received',
      visible: flowStep === 'tokens_received', // Only visible at this step
    },
  ]

  const handleStartOAuth = () => {
    setFlowStep('auth_request')
  }

  const handleNextStep = () => {
    switch (flowStep) {
      case 'idle':
        handleStartOAuth()
        break
      case 'auth_request':
        // After auth request, show login dialog
        setFlowStep('login_shown')
        setShowLoginDialog(true)
        break
      case 'login_shown':
        // Wait for user to login
        break
      case 'login_complete':
        // After login, show consent dialog
        setFlowStep('consent_shown')
        setShowConsentDialog(true)
        break
      case 'consent_shown':
        // Wait for user to allow
        break
      case 'code_received':
        // Move to token exchange step
        setFlowStep('token_exchange')
        break
      case 'token_exchange':
        // Exchange tokens - set ID token and move to tokens_received
        const newIdToken = makeJwt({
          sub: username || 'user@example.com',
          email: username || 'user@example.com',
          iss: 'https://okta.example.com',
          aud: 'google-calendar-client-id',
        })
        setIdToken(newIdToken)
        setShowToken(true)
        setFlowStep('tokens_received')
        break
      case 'tokens_received':
        // Already received, do nothing
        break
    }
  }

  const handleLogin = (enteredUsername: string, _password: string) => {
    setUsername(enteredUsername)
    setShowLoginDialog(false)
    setFlowStep('login_complete')
  }

  const handleAllow = () => {
    setShowConsentDialog(false)
    setFlowStep('code_received')
  }

  const handleDeny = () => {
    setShowConsentDialog(false)
    setFlowStep('idle')
    setIdToken(null)
    setUsername(null)
  }

  const handleReset = () => {
    setFlowStep('idle')
    setIdToken(null)
    setUsername(null)
    setShowLoginDialog(false)
    setShowConsentDialog(false)
    setShowToken(false)
  }

  const scopes = [
    { key: 'calendar.read', description: 'Read calendar events' },
    { key: 'calendar.write', description: 'Create & update events' },
    { key: 'profile.email', description: 'Know your email' },
  ]

  // Can go to next step if not idle, not waiting for dialog, and not at final step
  const canGoNext = 
    flowStep !== 'idle' && 
    flowStep !== 'login_shown' && 
    flowStep !== 'consent_shown' && 
    flowStep !== 'tokens_received'

  return (
    <div className="flex flex-col w-full h-full relative">
      {/* Control Buttons - Top left */}
      <div className="absolute top-4 left-4 z-50 flex gap-4">
        {flowStep === 'idle' ? (
          <Button onClick={handleStartOAuth} size="lg" className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700 shadow-lg">
            <Play className="h-5 w-5 mr-2" />
            Start OAuth Flow
          </Button>
        ) : (
          <>
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

      {/* Step Number Badge - Top right */}
      {flowStep !== 'idle' && stepMetadata[flowStep] && (
        <div className="absolute top-4 right-4 z-50">
          <div className="bg-neutral-800 text-neutral-100 px-6 py-3 rounded-lg shadow-lg border border-neutral-700">
            <div className="text-sm text-neutral-400">Step</div>
            <div className="text-3xl font-bold">{stepMetadata[flowStep]!.number}</div>
          </div>
        </div>
      )}

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
          {/* Animated Tokens */}
          {flowStep === 'auth_request' && (
            <AnimatedToken
              startX={530}
              startY={300}
              endX={1040}
              endY={300}
              color="#60a5fa"
              label="🔐"
              duration={1200}
            />
          )}
          {flowStep === 'code_received' && (
            <AnimatedToken
              startX={1040}
              startY={300}
              endX={530}
              endY={300}
              color="#10b981"
              label="📝"
              duration={1200}
            />
          )}
          {flowStep === 'token_exchange' && (
            <AnimatedToken
              startX={530}
              startY={300}
              endX={1040}
              endY={300}
              color="#8b5cf6"
              label="🔑"
              duration={1200}
            />
          )}
          {flowStep === 'tokens_received' && showToken && (
            <AnimatedToken
              startX={1040}
              startY={300}
              endX={530}
              endY={300}
              color="#ec4899"
              label="🎫"
              duration={1200}
              onComplete={() => setShowToken(false)}
            />
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

      {/* Consent Dialog */}
      <ConsentDialog
        open={showConsentDialog}
        onOpenChange={setShowConsentDialog}
        appName="Google Calendar"
        scopes={scopes}
        onAllow={handleAllow}
        onDeny={handleDeny}
      />
    </div>
  )
}