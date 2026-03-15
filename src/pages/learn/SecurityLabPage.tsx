import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowLeft,
  ShieldOff,
  ShieldCheck,
  AlertTriangle,
  Check,
  Play,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface LabScenario {
  id: string
  title: string
  description: string
  attackName: string
  protection: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  steps: LabStep[]
}

interface LabStep {
  id: string
  instruction: string
  isAttack: boolean
  result: string
  detail: string
}

const SCENARIOS: LabScenario[] = [
  {
    id: 'no-pkce',
    title: 'Authorization Code Interception',
    description:
      'What happens when a public client (SPA) does not use PKCE? An attacker intercepts the authorization code and exchanges it for tokens.',
    attackName: 'Code Interception Attack',
    protection: 'PKCE (Proof Key for Code Exchange)',
    difficulty: 'beginner',
    steps: [
      {
        id: 'start-flow',
        instruction: 'The SPA starts an OAuth flow WITHOUT PKCE — no code_challenge in the authorization request.',
        isAttack: false,
        result: 'GET /authorize?response_type=code&client_id=spa-app&redirect_uri=https://app.com/callback&scope=openid',
        detail: 'Notice: no code_challenge parameter. The auth server has no way to bind this request to a specific client instance.',
      },
      {
        id: 'user-authenticates',
        instruction: 'User authenticates and grants consent. The auth server redirects back with an authorization code.',
        isAttack: false,
        result: 'HTTP 302 → https://app.com/callback?code=AUTH_CODE_abc123&state=xyz',
        detail: 'The authorization code is in the URL. It travels through the browser, the network, and any intermediaries.',
      },
      {
        id: 'attacker-intercepts',
        instruction: 'A malicious browser extension / rogue app on the device intercepts the redirect URL and extracts the authorization code.',
        isAttack: true,
        result: 'Attacker captures: code=AUTH_CODE_abc123',
        detail: 'On mobile, a malicious app can register the same custom URL scheme. On desktop, browser extensions can read all navigation events.',
      },
      {
        id: 'attacker-exchanges',
        instruction: 'The attacker sends the stolen code to the token endpoint. Since there\'s no PKCE and the client is public (no client_secret), the exchange succeeds.',
        isAttack: true,
        result: 'POST /token → 200 OK: { access_token: "eyJ...", id_token: "eyJ..." }',
        detail: 'The auth server has no way to verify WHO is exchanging the code. Without PKCE, possession of the code is sufficient proof.',
      },
      {
        id: 'enable-pkce',
        instruction: 'Now enable PKCE: the SPA generates a code_verifier and sends code_challenge=SHA256(code_verifier) in the initial request.',
        isAttack: false,
        result: 'GET /authorize?...&code_challenge=E9Mel...&code_challenge_method=S256',
        detail: 'The code_verifier stays in the SPA\'s memory. Only the hash (code_challenge) is sent. The auth server stores it.',
      },
      {
        id: 'attacker-fails',
        instruction: 'The attacker intercepts the code again, but now the token exchange requires the code_verifier. The attacker doesn\'t have it.',
        isAttack: true,
        result: 'POST /token → 400: { error: "invalid_grant", error_description: "Code verifier mismatch" }',
        detail: 'PKCE defeated the attack. The stolen code is useless without the code_verifier. The attacker would need to steal from the SPA\'s JavaScript memory, which requires a much more sophisticated attack (XSS).',
      },
    ],
  },
  {
    id: 'no-state',
    title: 'Cross-Site Request Forgery (CSRF)',
    description:
      'Without the state parameter, an attacker can trick your app into accepting an authorization code from a different OAuth flow — linking the victim\'s session to the attacker\'s account.',
    attackName: 'Login CSRF / Session Fixation',
    protection: 'state parameter (cryptographic nonce)',
    difficulty: 'intermediate',
    steps: [
      {
        id: 'attacker-starts-flow',
        instruction: 'The attacker starts their own OAuth flow with the victim\'s app and authenticates as themselves.',
        isAttack: true,
        result: 'Attacker receives: https://app.com/callback?code=ATTACKER_CODE_xyz',
        detail: 'The attacker now has a valid authorization code for their own account. They don\'t use it — they weaponize it.',
      },
      {
        id: 'craft-url',
        instruction: 'Attacker crafts a URL with their authorization code and tricks the victim into clicking it (phishing email, hidden image tag, etc.).',
        isAttack: true,
        result: '<img src="https://app.com/callback?code=ATTACKER_CODE_xyz">',
        detail: 'The victim\'s browser makes a GET request to the app\'s callback URL with the ATTACKER\'s code. No user interaction needed beyond loading the page.',
      },
      {
        id: 'victim-app-accepts',
        instruction: 'Without a state parameter, the app has no way to verify this callback is a response to a flow the VICTIM started. It exchanges the code.',
        isAttack: true,
        result: 'App exchanges ATTACKER_CODE_xyz → tokens for ATTACKER\'s account',
        detail: 'The victim\'s session is now linked to the attacker\'s account. If this is a financial app, the victim might add their credit card to the attacker\'s account.',
      },
      {
        id: 'enable-state',
        instruction: 'Now enable the state parameter: the app generates a random value, stores it in the session, and includes it in the authorization request.',
        isAttack: false,
        result: 'GET /authorize?...&state=RANDOM_abc123 (stored in session cookie)',
        detail: 'The state value is tied to the user\'s browser session. The auth server will include it unchanged in the callback.',
      },
      {
        id: 'attack-detected',
        instruction: 'When the attacker\'s crafted callback arrives, the state parameter is missing or doesn\'t match the victim\'s session. The app rejects it.',
        isAttack: false,
        result: 'Callback: ?code=ATTACKER_CODE&state=WRONG → App: "State mismatch — request rejected"',
        detail: 'The attacker cannot forge the state value because they don\'t have access to the victim\'s session cookie. CSRF attack defeated.',
      },
    ],
  },
  {
    id: 'implicit-leak',
    title: 'Token Leakage via Browser History',
    description:
      'The Implicit flow returns access tokens directly in the URL fragment. See how this exposes tokens to multiple attack vectors that don\'t exist in the Authorization Code flow.',
    attackName: 'Token Exposure (History, Referer, Logs)',
    protection: 'Authorization Code + PKCE (never put tokens in URLs)',
    difficulty: 'beginner',
    steps: [
      {
        id: 'implicit-redirect',
        instruction: 'The SPA uses the Implicit flow (response_type=token). After authentication, the auth server redirects with the token in the URL fragment.',
        isAttack: false,
        result: 'HTTP 302 → https://app.com/callback#access_token=eyJhbGciOiJS...&token_type=Bearer&expires_in=3600',
        detail: 'The access token is now in the browser\'s address bar. The fragment (#...) is not sent to the server, but it IS visible locally.',
      },
      {
        id: 'history-attack',
        instruction: 'The token is saved in the browser\'s history. Anyone who checks the history (shared computer, forensic analysis, malware) can extract it.',
        isAttack: true,
        result: 'Browser History → "https://app.com/callback#access_token=eyJhbGciOiJS..."',
        detail: 'Even if the SPA clears the fragment with history.replaceState(), there\'s a race condition — the browser may have already recorded it.',
      },
      {
        id: 'referer-attack',
        instruction: 'The callback page includes a third-party script (analytics, ads, CDN). The browser sends the full URL including fragment in the Referer header.',
        isAttack: true,
        result: 'Referer: https://app.com/callback#access_token=eyJhbGciOiJS...',
        detail: 'The third-party server now has the access token. They can make API calls as the user. Modern Referrer-Policy headers help, but can\'t be relied upon universally.',
      },
      {
        id: 'auth-code-comparison',
        instruction: 'Compare with Authorization Code + PKCE: the callback URL contains only a short-lived, single-use code that\'s useless without the code_verifier.',
        isAttack: false,
        result: 'https://app.com/callback?code=SHORT_LIVED_CODE — useless without code_verifier',
        detail: 'The access token is returned in the HTTP response body of the POST to /token — never in a URL. Browser history, Referer headers, and server logs never see it.',
      },
    ],
  },
]

const difficultyColors = {
  beginner: 'text-green-400 bg-green-900/20 border-green-800/30',
  intermediate: 'text-amber-400 bg-amber-900/20 border-amber-800/30',
  advanced: 'text-red-400 bg-red-900/20 border-red-800/30',
}

/**
 * Security Lab — Layer 4: "Break"
 * Users walk through attack scenarios step by step,
 * see attacks succeed, then see how protections stop them.
 */
export function SecurityLabPage() {
  const [activeScenario, setActiveScenario] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  const scenario = SCENARIOS.find((s) => s.id === activeScenario)

  const handleStart = (id: string) => {
    setActiveScenario(id)
    setCurrentStep(0)
    toast('Scenario started — follow each step')
  }

  const handleNext = () => {
    if (scenario && currentStep < scenario.steps.length - 1) {
      setCurrentStep((s) => s + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1)
  }

  const handleReset = () => {
    setActiveScenario(null)
    setCurrentStep(0)
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900/80">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-neutral-500 hover:text-neutral-300 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-semibold">Security Lab</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
            Layer 4: Break
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {!scenario ? (
            /* Scenario selection */
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-neutral-400 mb-8 max-w-2xl">
                Understanding security means understanding attacks. Walk through real attack
                scenarios, see them succeed, then enable protections and watch them fail.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {SCENARIOS.map((s) => (
                  <motion.div
                    key={s.id}
                    className="bg-neutral-900 rounded-lg border border-neutral-800 p-5 cursor-pointer hover:border-neutral-600 transition-colors"
                    onClick={() => handleStart(s.id)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldOff className="h-5 w-5 text-red-400" />
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded border font-medium',
                          difficultyColors[s.difficulty],
                        )}
                      >
                        {s.difficulty}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-neutral-200 mb-2">{s.title}</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed mb-3">
                      {s.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-red-400">Attack:</span>
                      <span className="text-neutral-400">{s.attackName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <span className="text-green-400">Fix:</span>
                      <span className="text-neutral-400">{s.protection}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Active scenario */
            <motion.div
              key="scenario"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Scenario header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-neutral-100">{scenario.title}</h2>
                  <p className="text-sm text-neutral-400 mt-1">{scenario.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="bg-neutral-900 border-neutral-700 text-neutral-200 hover:bg-neutral-800"
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Back
                </Button>
              </div>

              {/* Steps */}
              <div className="space-y-4 mb-8">
                {scenario.steps.map((step, i) => {
                  const isReached = i <= currentStep
                  const isCurrent = i === currentStep
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{
                        opacity: isReached ? 1 : 0.3,
                        x: 0,
                      }}
                      transition={{ delay: isCurrent ? 0.1 : 0, duration: 0.3 }}
                      className={cn(
                        'rounded-lg border p-4 transition-colors',
                        isCurrent
                          ? step.isAttack
                            ? 'bg-red-950/30 border-red-800/50'
                            : 'bg-neutral-900 border-emerald-800/50'
                          : isReached
                            ? 'bg-neutral-900/50 border-neutral-800'
                            : 'bg-neutral-950 border-neutral-800/50',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Step indicator */}
                        <div
                          className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                            isCurrent
                              ? step.isAttack
                                ? 'bg-red-600 text-white'
                                : 'bg-emerald-600 text-white'
                              : isReached
                                ? 'bg-neutral-700 text-neutral-300'
                                : 'bg-neutral-800 text-neutral-600',
                          )}
                        >
                          {isReached && !isCurrent ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : step.isAttack ? (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Label */}
                          {step.isAttack && (
                            <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">
                              Attacker
                            </span>
                          )}

                          {/* Instruction */}
                          <p
                            className={cn(
                              'text-sm leading-relaxed',
                              isCurrent ? 'text-neutral-200' : 'text-neutral-500',
                            )}
                          >
                            {step.instruction}
                          </p>

                          {/* Result */}
                          {isReached && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              transition={{ duration: 0.3 }}
                              className="mt-3"
                            >
                              <div
                                className={cn(
                                  'rounded-md px-3 py-2 font-mono text-xs',
                                  step.isAttack
                                    ? 'bg-red-950/50 text-red-300 border border-red-900/50'
                                    : 'bg-neutral-800 text-emerald-300 border border-neutral-700',
                                )}
                              >
                                {step.result}
                              </div>
                              <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                                {step.detail}
                              </p>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  size="sm"
                  className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700 disabled:opacity-50"
                >
                  Previous
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={currentStep >= scenario.steps.length - 1}
                  size="sm"
                  className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700 disabled:opacity-50"
                >
                  <Play className="h-4 w-4 mr-1.5" />
                  Next Step
                </Button>
                <span className="text-xs text-neutral-600 ml-2">
                  Step {currentStep + 1} of {scenario.steps.length}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
