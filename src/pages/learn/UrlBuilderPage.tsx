import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, Check, AlertTriangle, Copy, ExternalLink, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface UrlParam {
  key: string
  value: string
  required: boolean
  enabled: boolean
  description: string
  why: string
  risk: string
}

const INITIAL_PARAMS: UrlParam[] = [
  {
    key: 'response_type',
    value: 'code',
    required: true,
    enabled: true,
    description: 'Tells the auth server to return an authorization code',
    why: 'The code is a short-lived "claim ticket" that gets exchanged for tokens server-side. This keeps tokens out of the browser URL.',
    risk: 'Using response_type=token (Implicit) returns the access token directly in the URL fragment — visible in browser history and Referer headers.',
  },
  {
    key: 'client_id',
    value: 'my-app-client-id',
    required: true,
    enabled: true,
    description: 'Identifies your application to the auth server',
    why: 'The auth server needs to know which app is requesting access so it can verify the redirect_uri and enforce per-app policies.',
    risk: 'Without client_id, the auth server has no way to track which application requested access or enforce rate limits and security policies.',
  },
  {
    key: 'redirect_uri',
    value: 'https://myapp.com/callback',
    required: true,
    enabled: true,
    description: 'Where the auth server sends the user after authentication',
    why: 'Must exactly match a pre-registered URI. This prevents attackers from redirecting tokens/codes to their own server.',
    risk: 'If redirect_uri matching is lax, an attacker can register a similar URI and intercept authorization codes. This is called an open redirect attack.',
  },
  {
    key: 'scope',
    value: 'openid profile email',
    required: false,
    enabled: true,
    description: 'Permissions your app is requesting',
    why: 'Scopes follow the principle of least privilege — only request what you need. Users see these in the consent screen.',
    risk: 'Over-scoping (requesting admin:*) means a compromised token grants maximum damage. Always request the minimum scopes needed.',
  },
  {
    key: 'state',
    value: '',
    required: false,
    enabled: false,
    description: 'Random value for CSRF protection',
    why: 'The state parameter is round-tripped: you generate it, send it, and verify it matches when the callback comes back. This proves the callback is a response to YOUR request.',
    risk: 'Without state, an attacker can craft a callback URL with their own authorization code and trick your app into using it (CSRF attack). Your app would link the attacker\'s account to the victim.',
  },
  {
    key: 'code_challenge',
    value: '',
    required: false,
    enabled: false,
    description: 'SHA-256 hash of the code_verifier (PKCE)',
    why: 'PKCE creates a cryptographic binding between the authorization request and the token exchange. Only the app that generated the code_verifier can complete the flow.',
    risk: 'Without PKCE, anyone who intercepts the authorization code can exchange it for tokens. Mobile apps and SPAs are especially vulnerable to code interception.',
  },
  {
    key: 'code_challenge_method',
    value: 'S256',
    required: false,
    enabled: false,
    description: 'Hash method used for PKCE (always use S256)',
    why: 'S256 means the code_challenge is a SHA-256 hash of the code_verifier. The "plain" method sends the verifier as-is, which defeats the purpose.',
    risk: 'Using "plain" instead of "S256" means the code_challenge IS the code_verifier — an attacker who sees the challenge can use it directly. Always use S256.',
  },
  {
    key: 'nonce',
    value: '',
    required: false,
    enabled: false,
    description: 'Random value to prevent token replay (OIDC)',
    why: 'The nonce is embedded in the id_token. When you receive the token, you verify the nonce matches what you sent — proving the token was freshly issued for this request.',
    risk: 'Without a nonce, an attacker could replay a previously captured id_token. Your app would accept it as fresh, potentially authenticating as the wrong user.',
  },
]

type ValidationLevel = 'valid' | 'warning' | 'error'

interface ValidationResult {
  level: ValidationLevel
  message: string
}

function validate(params: UrlParam[]): ValidationResult[] {
  const results: ValidationResult[] = []
  const enabled = params.filter((p) => p.enabled)

  // Check required params
  for (const p of INITIAL_PARAMS.filter((ip) => ip.required)) {
    if (!enabled.find((e) => e.key === p.key)) {
      results.push({ level: 'error', message: `Missing required parameter: ${p.key}` })
    }
  }

  // Check PKCE
  const hasChallenge = enabled.find((p) => p.key === 'code_challenge')
  const hasMethod = enabled.find((p) => p.key === 'code_challenge_method')
  if (hasChallenge && !hasMethod) {
    results.push({ level: 'error', message: 'code_challenge requires code_challenge_method' })
  }
  if (!hasChallenge) {
    results.push({
      level: 'warning',
      message: 'No PKCE (code_challenge) — authorization code can be intercepted',
    })
  }

  // Check state
  if (!enabled.find((p) => p.key === 'state')) {
    results.push({
      level: 'warning',
      message: 'No state parameter — vulnerable to CSRF attacks',
    })
  }

  // Check empty values
  for (const p of enabled) {
    if (!p.value.trim()) {
      results.push({ level: 'error', message: `${p.key} is enabled but has no value` })
    }
  }

  if (results.length === 0) {
    results.push({ level: 'valid', message: 'Authorization URL looks good!' })
  }

  return results
}

/**
 * Interactive Authorization URL Builder.
 * Layer 3: "Do" — users construct the authorization URL themselves,
 * toggle parameters on/off, and see real-time validation.
 */
export function UrlBuilderPage() {
  const [params, setParams] = useState<UrlParam[]>(INITIAL_PARAMS)
  const [selectedParam, setSelectedParam] = useState<string | null>(null)
  const [baseUrl, setBaseUrl] = useState('https://auth.example.com/authorize')

  const enabledParams = params.filter((p) => p.enabled)
  const validations = useMemo(() => validate(params), [params])
  const hasErrors = validations.some((v) => v.level === 'error')
  const hasWarnings = validations.some((v) => v.level === 'warning')

  const builtUrl = useMemo(() => {
    const url = new URL(baseUrl)
    enabledParams.forEach((p) => {
      if (p.value.trim()) url.searchParams.set(p.key, p.value)
    })
    return url.toString()
  }, [baseUrl, enabledParams])

  const toggleParam = (key: string) => {
    setParams((prev) =>
      prev.map((p) => (p.key === key ? { ...p, enabled: !p.enabled } : p)),
    )
  }

  const updateValue = (key: string, value: string) => {
    setParams((prev) =>
      prev.map((p) => (p.key === key ? { ...p, value } : p)),
    )
  }

  const generateRandom = (key: string) => {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    const value = Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 32)
    updateValue(key, value)
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(builtUrl)
    toast.success('URL copied to clipboard')
  }

  const resetAll = () => {
    setParams(INITIAL_PARAMS)
    setSelectedParam(null)
    toast('Reset to defaults')
  }

  const selected = params.find((p) => p.key === selectedParam)

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900/80">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-neutral-500 hover:text-neutral-300 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-semibold">Authorization URL Builder</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">
            Layer 3: Do
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-[1fr_340px] gap-6">
          {/* Main area */}
          <div className="space-y-6">
            {/* Base URL */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Authorization Endpoint
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm font-mono focus:outline-none focus:border-neutral-500"
              />
            </div>

            {/* Parameter toggles */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-neutral-300">Query Parameters</h2>
                <button onClick={resetAll} className="text-xs text-neutral-500 hover:text-neutral-300 flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
              <div className="space-y-2">
                {params.map((param) => (
                  <motion.div
                    key={param.key}
                    layout
                    className={cn(
                      'rounded-lg border p-3 transition-colors cursor-pointer',
                      param.enabled
                        ? 'bg-neutral-900 border-neutral-700'
                        : 'bg-neutral-950 border-neutral-800 opacity-60',
                      selectedParam === param.key && 'border-blue-600 bg-blue-950/20',
                    )}
                    onClick={() => setSelectedParam(param.key === selectedParam ? null : param.key)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!param.required) toggleParam(param.key)
                        }}
                        className={cn(
                          'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                          param.enabled
                            ? 'bg-emerald-600 border-emerald-500'
                            : 'bg-neutral-800 border-neutral-600',
                          param.required && 'cursor-not-allowed',
                        )}
                      >
                        {param.enabled && <Check className="h-3 w-3 text-white" />}
                      </button>

                      {/* Key */}
                      <code className={cn(
                        'text-sm font-semibold flex-shrink-0 w-[180px]',
                        param.enabled ? 'text-cyan-400' : 'text-neutral-600',
                      )}>
                        {param.key}
                        {param.required && <span className="text-red-400 ml-0.5">*</span>}
                      </code>

                      {/* Value input */}
                      {param.enabled && (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={param.value}
                            onChange={(e) => {
                              e.stopPropagation()
                              updateValue(param.key, e.target.value)
                            }}
                            onClick={(e) => e.stopPropagation()}
                            placeholder={param.description}
                            className="flex-1 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-mono focus:outline-none focus:border-neutral-500"
                          />
                          {(param.key === 'state' || param.key === 'nonce' || param.key === 'code_challenge') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                generateRandom(param.key)
                              }}
                              className="text-[10px] text-neutral-500 hover:text-neutral-300 px-2 py-1 bg-neutral-800 rounded border border-neutral-700"
                            >
                              Generate
                            </button>
                          )}
                        </div>
                      )}

                      {!param.enabled && (
                        <span className="text-xs text-neutral-600 truncate">{param.description}</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Built URL */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="text-sm font-semibold text-neutral-300">Built URL</h2>
                <button
                  onClick={copyUrl}
                  className="text-xs text-neutral-500 hover:text-neutral-300 flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </button>
              </div>
              <div className="bg-neutral-900 rounded-lg border border-neutral-700 p-4 font-mono text-xs break-all leading-relaxed">
                <span className="text-neutral-500">{baseUrl}</span>
                {enabledParams.length > 0 && <span className="text-neutral-500">?</span>}
                {enabledParams.map((p, i) => (
                  <span key={p.key}>
                    {i > 0 && <span className="text-neutral-600">&amp;</span>}
                    <span className="text-cyan-400">{p.key}</span>
                    <span className="text-neutral-600">=</span>
                    <span className="text-green-400">{encodeURIComponent(p.value)}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Validation */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-neutral-300">Validation</h2>
              <AnimatePresence>
                {validations.map((v, i) => (
                  <motion.div
                    key={`${v.level}-${v.message}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-xs',
                      v.level === 'valid' && 'bg-emerald-900/20 text-emerald-400 border border-emerald-800/30',
                      v.level === 'warning' && 'bg-amber-900/20 text-amber-400 border border-amber-800/30',
                      v.level === 'error' && 'bg-red-900/20 text-red-400 border border-red-800/30',
                    )}
                  >
                    {v.level === 'valid' ? (
                      <Check className="h-3.5 w-3.5 flex-shrink-0" />
                    ) : v.level === 'warning' ? (
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    )}
                    {v.message}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Action */}
            <div className="flex items-center gap-3">
              <Button
                disabled={hasErrors}
                className={cn(
                  'gap-2',
                  hasErrors
                    ? 'opacity-50'
                    : hasWarnings
                      ? 'bg-amber-700 hover:bg-amber-600'
                      : 'bg-emerald-700 hover:bg-emerald-600',
                )}
                onClick={() => {
                  if (hasWarnings) {
                    toast.warning('URL has security warnings — see validation above')
                  } else {
                    toast.success('Authorization URL is ready to use!')
                  }
                }}
              >
                <ExternalLink className="h-4 w-4" />
                {hasErrors ? 'Fix errors first' : hasWarnings ? 'Send (with warnings)' : 'Ready to send'}
              </Button>
              {hasWarnings && !hasErrors && (
                <span className="text-xs text-amber-500">
                  Enable state and PKCE for a secure flow
                </span>
              )}
            </div>
          </div>

          {/* Right panel: Parameter details */}
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden sticky top-6"
                >
                  <div className="px-4 py-3 border-b border-neutral-800">
                    <code className="text-sm font-bold text-cyan-400">{selected.key}</code>
                    {selected.required && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-800/30">
                        Required
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-4">
                    {/* What */}
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 mb-1">
                        What
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {selected.description}
                      </p>
                    </div>

                    {/* Why */}
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-1">
                        Why
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {selected.why}
                      </p>
                    </div>

                    {/* Risk */}
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400 mb-1">
                        Without this
                      </div>
                      <p className="text-xs text-red-300/80 leading-relaxed bg-red-950/20 rounded p-2 border border-red-900/30">
                        {selected.risk}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-neutral-900 rounded-lg border border-neutral-800 p-6 text-center sticky top-6"
                >
                  <p className="text-sm text-neutral-500">
                    Click a parameter to learn what it does, why it exists, and what goes wrong without it.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
