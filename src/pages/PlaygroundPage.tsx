import { useState, useReducer, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Check,
  Lock,
  Loader2,
  Copy,
  ExternalLink,
  RefreshCw,
  Shield,
  Key,
  Globe,
  Code2,
  Sparkles,
} from 'lucide-react'
import confetti from 'canvas-confetti'

import { ProviderSelector } from '@/components/playground/ProviderSelector'
import { JwtDecoder } from '@/components/playground/JwtDecoder'
import { SecurityWarnings } from '@/components/playground/SecurityWarnings'
import { SyntaxHighlight, toJsonString } from '@/components/SyntaxHighlight'

import { PROVIDERS, buildOidcUrls, type OAuthProviderConfig } from '@/lib/providers'
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  generateNonce,
} from '@/lib/pkce'
import {
  saveFlowState,
  restoreFlowState,
  clearFlowState,
  clearAllPlaygroundData,
  type StoredFlowState,
} from '@/lib/flowState'
import { exchangeCodeForTokens } from '@/services/oauthFlow'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────

const STEP_TITLES = [
  'Choose Provider',
  'Generate PKCE',
  'Build Authorization URL',
  'Handle Callback',
  'Exchange Code for Tokens',
  'Decode Tokens',
] as const

const STEP_ICONS = [Globe, Shield, Code2, ExternalLink, Key, Sparkles]

type StepStatus = 'locked' | 'active' | 'complete'

type TextFieldKey = 'clientId' | 'redirectUri' | 'scopes' | 'issuerUrl'

interface PlaygroundState {
  currentStep: number
  expandedSteps: number[]

  // Step 0: Provider config
  providerId: string
  clientId: string
  redirectUri: string
  scopes: string
  issuerUrl: string
  authorizationUrl: string
  tokenUrl: string

  // Step 1: PKCE
  codeVerifier: string
  codeChallenge: string
  stateParam: string
  nonce: string

  // Step 3: Callback
  callbackCode: string
  callbackState: string

  // Step 4: Token exchange
  exchangeLoading: boolean
  tokenResponse: Record<string, unknown> | null

  // Step 5: Tokens
  tokens: Record<string, string>

  error: string | null
}

type Action =
  | { type: 'SELECT_PROVIDER'; providerId: string }
  | { type: 'SET_FIELD'; field: TextFieldKey; value: string }
  | { type: 'COMPLETE_SETUP'; authorizationUrl: string; tokenUrl: string }
  | {
      type: 'SET_PKCE'
      codeVerifier: string
      codeChallenge: string
      stateParam: string
      nonce: string
    }
  | { type: 'ADVANCE_STEP' }
  | { type: 'SET_EXCHANGE_LOADING'; loading: boolean }
  | {
      type: 'SET_TOKEN_RESPONSE'
      response: Record<string, unknown>
      tokens: Record<string, string>
    }
  | { type: 'TOGGLE_STEP'; step: number }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESTORE'; state: Partial<PlaygroundState> }
  | { type: 'RESET' }

// ─── Constants & Initial State ──────────────────────────────────

const callbackUrl =
  typeof window !== 'undefined'
    ? `${window.location.origin}/playground/callback`
    : 'http://localhost:5173/playground/callback'

function getInitialState(): PlaygroundState {
  return {
    currentStep: 0,
    expandedSteps: [0],
    providerId: PROVIDERS[0].id,
    clientId: '',
    redirectUri: callbackUrl,
    scopes: PROVIDERS[0].defaultScopes.join(' '),
    issuerUrl: '',
    authorizationUrl: PROVIDERS[0].authorizationUrl,
    tokenUrl: PROVIDERS[0].tokenUrl,
    codeVerifier: '',
    codeChallenge: '',
    stateParam: '',
    nonce: '',
    callbackCode: '',
    callbackState: '',
    exchangeLoading: false,
    tokenResponse: null,
    tokens: {},
    error: null,
  }
}

// ─── Reducer ────────────────────────────────────────────────────

function reducer(state: PlaygroundState, action: Action): PlaygroundState {
  switch (action.type) {
    case 'SELECT_PROVIDER': {
      const provider = PROVIDERS.find((p) => p.id === action.providerId) ?? PROVIDERS[0]
      return {
        ...state,
        providerId: provider.id,
        scopes: provider.defaultScopes.join(' '),
        authorizationUrl: provider.authorizationUrl,
        tokenUrl: provider.tokenUrl,
        issuerUrl: '',
        error: null,
      }
    }

    case 'SET_FIELD':
      return { ...state, [action.field]: action.value, error: null }

    case 'COMPLETE_SETUP':
      return {
        ...state,
        authorizationUrl: action.authorizationUrl,
        tokenUrl: action.tokenUrl,
        currentStep: 1,
        expandedSteps: [1],
        error: null,
      }

    case 'SET_PKCE':
      return {
        ...state,
        codeVerifier: action.codeVerifier,
        codeChallenge: action.codeChallenge,
        stateParam: action.stateParam,
        nonce: action.nonce,
      }

    case 'ADVANCE_STEP': {
      if (state.currentStep >= 5) return state
      const next = state.currentStep + 1
      return {
        ...state,
        currentStep: next,
        expandedSteps: [next],
        error: null,
      }
    }

    case 'SET_EXCHANGE_LOADING':
      return { ...state, exchangeLoading: action.loading, error: null }

    case 'SET_TOKEN_RESPONSE':
      return {
        ...state,
        tokenResponse: action.response,
        tokens: action.tokens,
        exchangeLoading: false,
        currentStep: 5,
        expandedSteps: [5],
      }

    case 'TOGGLE_STEP': {
      const isExpanded = state.expandedSteps.includes(action.step)
      return {
        ...state,
        expandedSteps: isExpanded
          ? state.expandedSteps.filter((s) => s !== action.step)
          : [...state.expandedSteps, action.step],
      }
    }

    case 'SET_ERROR':
      return { ...state, error: action.error, exchangeLoading: false }

    case 'RESTORE':
      return { ...state, ...action.state }

    case 'RESET':
      return getInitialState()

    default:
      return state
  }
}

// ─── Helper Components ──────────────────────────────────────────

function getStepStatus(stepIndex: number, currentStep: number): StepStatus {
  if (stepIndex < currentStep) return 'complete'
  if (stepIndex === currentStep) return 'active'
  return 'locked'
}

function StepCard({
  stepIndex,
  currentStep,
  isExpanded,
  onToggle,
  children,
}: {
  stepIndex: number
  currentStep: number
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const status = getStepStatus(stepIndex, currentStep)
  const Icon = STEP_ICONS[stepIndex]
  const title = STEP_TITLES[stepIndex]

  return (
    <div
      className={cn(
        'border rounded-xl transition-all duration-200',
        status === 'active' && 'border-emerald-500/40 shadow-lg shadow-emerald-500/5',
        status === 'complete' && 'border-neutral-700/50',
        status === 'locked' && 'border-neutral-800/50 opacity-50',
      )}
    >
      <button
        onClick={onToggle}
        disabled={status === 'locked'}
        className={cn(
          'w-full flex items-center gap-3 px-5 py-4 text-left transition-colors rounded-xl',
          status !== 'locked' && 'hover:bg-neutral-800/30',
          status === 'locked' && 'cursor-not-allowed',
        )}
      >
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold',
            status === 'active' && 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40',
            status === 'complete' && 'bg-emerald-500 text-white',
            status === 'locked' && 'bg-neutral-800 text-neutral-600',
          )}
        >
          {status === 'complete' ? (
            <Check className="h-4 w-4" />
          ) : status === 'locked' ? (
            <Lock className="h-3.5 w-3.5" />
          ) : (
            stepIndex + 1
          )}
        </div>

        <Icon
          className={cn(
            'h-4 w-4 flex-shrink-0',
            status === 'active' ? 'text-emerald-400' : 'text-neutral-500',
          )}
        />

        <span
          className={cn(
            'font-medium flex-1',
            status === 'active' ? 'text-neutral-100' : 'text-neutral-400',
          )}
        >
          {title}
        </span>

        {status !== 'locked' &&
          (isExpanded ? (
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-neutral-500" />
          ))}
      </button>

      {isExpanded && status !== 'locked' && (
        <div className="px-5 pb-5 border-t border-neutral-800/50">{children}</div>
      )}
    </div>
  )
}

function ParamRow({
  label,
  value,
  description,
  source,
}: {
  label: string
  value: string
  description?: string
  source?: string
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 items-start py-2 border-b border-neutral-800/50 last:border-0">
      <div>
        <code className="text-xs font-mono text-cyan-400">{label}</code>
        {source && <div className="text-[10px] text-neutral-600 mt-0.5">{source}</div>}
      </div>
      <div>
        <code className="text-xs font-mono text-green-400 break-all">{value}</code>
        {description && <p className="text-[10px] text-neutral-500 mt-1">{description}</p>}
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'transition-colors p-1',
        copied ? 'text-emerald-400' : 'text-neutral-500 hover:text-neutral-300',
      )}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

// ─── Main Component ─────────────────────────────────────────────

export function PlaygroundPage() {
  const [searchParams] = useSearchParams()
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState)

  const provider = PROVIDERS.find((p) => p.id === state.providerId) ?? PROVIDERS[0]

  // Resume flow after redirect
  const resumeFlow = useCallback(() => {
    const callbackData = sessionStorage.getItem('oauth_playground_callback')
    if (!callbackData) return

    let code: string, cbState: string
    try {
      const parsed = JSON.parse(callbackData)
      code = parsed.code
      cbState = parsed.state
    } catch {
      sessionStorage.removeItem('oauth_playground_callback')
      dispatch({ type: 'SET_ERROR', error: 'Invalid callback data in session storage' })
      return
    }
    sessionStorage.removeItem('oauth_playground_callback')

    if (!code || !cbState) {
      dispatch({ type: 'SET_ERROR', error: 'Missing code or state in callback data' })
      return
    }

    const flowState = restoreFlowState()
    if (!flowState) {
      dispatch({ type: 'SET_ERROR', error: 'No pending flow state found' })
      return
    }

    dispatch({
      type: 'RESTORE',
      state: {
        currentStep: 3,
        expandedSteps: [3],
        providerId: flowState.providerId,
        clientId: flowState.clientId,
        redirectUri: flowState.redirectUri,
        scopes: flowState.scopes.join(' '),
        authorizationUrl: flowState.authorizationUrl,
        tokenUrl: flowState.tokenUrl,
        codeVerifier: flowState.codeVerifier ?? '',
        codeChallenge: flowState.codeChallenge ?? '',
        stateParam: flowState.state,
        nonce: flowState.nonce ?? '',
        callbackCode: code,
        callbackState: cbState,
      },
    })

    // Clean ?flow=resume from URL
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  useEffect(() => {
    if (searchParams.get('flow') === 'resume') {
      resumeFlow()
    }
  }, [searchParams, resumeFlow])

  // ─── Step Handlers ──────────────────────────────────────────

  const handleCompleteStep0 = () => {
    if (!state.clientId.trim()) {
      dispatch({ type: 'SET_ERROR', error: 'Client ID is required' })
      return
    }

    let authUrl = provider.authorizationUrl
    let tokUrl = provider.tokenUrl

    if (provider.needsIssuerUrl) {
      if (!state.issuerUrl.trim()) {
        dispatch({ type: 'SET_ERROR', error: 'Issuer URL is required for this provider' })
        return
      }
      const urls = buildOidcUrls(state.issuerUrl, provider.id)
      authUrl = urls.authorizationUrl
      tokUrl = urls.tokenUrl
    }

    if (!authUrl || !tokUrl) {
      dispatch({ type: 'SET_ERROR', error: 'Authorization URL and Token URL are required' })
      return
    }

    dispatch({ type: 'COMPLETE_SETUP', authorizationUrl: authUrl, tokenUrl: tokUrl })
  }

  const handleGeneratePkce = async () => {
    const verifier = generateCodeVerifier()
    const challenge = await generateCodeChallenge(verifier)
    const stateParam = generateState()
    const nonceVal = generateNonce()

    dispatch({
      type: 'SET_PKCE',
      codeVerifier: verifier,
      codeChallenge: challenge,
      stateParam,
      nonce: nonceVal,
    })
  }

  const handleRedirect = () => {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: state.clientId,
      redirect_uri: state.redirectUri,
      scope: state.scopes,
      state: state.stateParam,
      nonce: state.nonce,
      code_challenge: state.codeChallenge,
      code_challenge_method: 'S256',
      ...(provider.extraAuthParams ?? {}),
    })

    const authUrl = `${state.authorizationUrl}?${params.toString()}`

    const flowState: StoredFlowState = {
      flowId: state.stateParam,
      providerId: provider.id,
      flowType: 'authorization_code_pkce',
      clientId: state.clientId,
      redirectUri: state.redirectUri,
      scopes: state.scopes.split(' ').filter(Boolean),
      codeVerifier: state.codeVerifier,
      codeChallenge: state.codeChallenge,
      state: state.stateParam,
      nonce: state.nonce,
      startedAt: Date.now(),
      authorizationUrl: state.authorizationUrl,
      tokenUrl: state.tokenUrl,
      preRedirectLog: '[]',
      playgroundSnapshot: JSON.stringify({
        providerId: state.providerId,
        clientId: state.clientId,
        redirectUri: state.redirectUri,
        scopes: state.scopes,
        issuerUrl: state.issuerUrl,
        authorizationUrl: state.authorizationUrl,
        tokenUrl: state.tokenUrl,
        codeVerifier: state.codeVerifier,
        codeChallenge: state.codeChallenge,
        stateParam: state.stateParam,
        nonce: state.nonce,
      }),
    }
    saveFlowState(flowState)

    window.location.href = authUrl
  }

  const handleExchangeTokens = async () => {
    dispatch({ type: 'SET_EXCHANGE_LOADING', loading: true })

    try {
      const result = await exchangeCodeForTokens(
        state.tokenUrl,
        state.callbackCode,
        state.clientId,
        state.redirectUri,
        state.codeVerifier,
      )

      if (result.error) {
        dispatch({ type: 'SET_ERROR', error: result.error })
        return
      }

      if (!result.tokens) {
        dispatch({ type: 'SET_ERROR', error: 'No tokens received from provider' })
        return
      }

      const receivedTokens: Record<string, string> = {}
      if (result.tokens.access_token)
        receivedTokens.access_token = String(result.tokens.access_token)
      if (result.tokens.id_token) receivedTokens.id_token = String(result.tokens.id_token)
      if (result.tokens.refresh_token)
        receivedTokens.refresh_token = String(result.tokens.refresh_token)

      dispatch({
        type: 'SET_TOKEN_RESPONSE',
        response: result.tokens,
        tokens: receivedTokens,
      })

      clearFlowState()

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#22c55e', '#6ee7b7', '#059669'],
      })
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : 'Token exchange failed',
      })
    }
  }

  const handleReset = () => {
    clearAllPlaygroundData()
    clearFlowState()
    dispatch({ type: 'RESET' })
  }

  // ─── Step Renderers ─────────────────────────────────────────

  const isStep0Active = state.currentStep === 0

  const renderStep0 = () => (
    <form
      className="space-y-4 pt-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (isStep0Active) handleCompleteStep0()
      }}
    >
      <ProviderSelector
        selectedId={state.providerId}
        onSelect={(p: OAuthProviderConfig) =>
          dispatch({ type: 'SELECT_PROVIDER', providerId: p.id })
        }
      />

      {provider.notes && (
        <div className="p-3 rounded-lg bg-neutral-800/40 border border-neutral-700/50">
          <p className="text-xs text-neutral-400 leading-relaxed">{provider.notes}</p>
          {provider.docUrl && (
            <a
              href={provider.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-500 hover:text-emerald-400 mt-1.5 inline-flex items-center gap-1"
            >
              Documentation <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {provider.needsIssuerUrl && (
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">Issuer URL</label>
          <input
            type="url"
            value={state.issuerUrl}
            onChange={(e) =>
              dispatch({ type: 'SET_FIELD', field: 'issuerUrl', value: e.target.value })
            }
            placeholder={
              provider.id === 'auth0'
                ? 'https://dev-xxxxx.us.auth0.com'
                : 'https://dev-xxxxx.okta.com/oauth2/default'
            }
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-500/50 focus:outline-none"
          />
        </div>
      )}

      <div>
        <label className="block text-xs text-neutral-400 mb-1.5">Client ID</label>
        <input
          type="text"
          value={state.clientId}
          onChange={(e) =>
            dispatch({ type: 'SET_FIELD', field: 'clientId', value: e.target.value })
          }
          placeholder="Your OAuth client ID"
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-500/50 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs text-neutral-400 mb-1.5">Redirect URI</label>
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={state.redirectUri}
            onChange={(e) =>
              dispatch({ type: 'SET_FIELD', field: 'redirectUri', value: e.target.value })
            }
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono text-neutral-200 focus:border-emerald-500/50 focus:outline-none"
          />
          <CopyButton text={state.redirectUri} />
        </div>
        <p className="text-[10px] text-neutral-500 mt-1">
          Add this URI to your OAuth app's allowed redirect URIs
        </p>
      </div>

      <div>
        <label className="block text-xs text-neutral-400 mb-1.5">Scopes</label>
        <input
          type="text"
          value={state.scopes}
          onChange={(e) =>
            dispatch({ type: 'SET_FIELD', field: 'scopes', value: e.target.value })
          }
          placeholder="openid profile email"
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-500/50 focus:outline-none"
        />
      </div>

      {isStep0Active ? (
        <button
          type="submit"
          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors"
        >
          Continue
        </button>
      ) : (
        <p className="text-xs text-neutral-600 italic">
          To change these settings, click &quot;Start Over&quot; above.
        </p>
      )}
    </form>
  )

  const renderStep1 = () => (
    <div className="space-y-4 pt-4">
      {!state.codeVerifier ? (
        <>
          <p className="text-sm text-neutral-400">
            PKCE (Proof Key for Code Exchange) prevents authorization code interception. Click
            below to generate a cryptographically random code verifier and its SHA-256 challenge.
          </p>
          <button
            onClick={handleGeneratePkce}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Generate PKCE Values
          </button>
        </>
      ) : (
        <>
          <div className="space-y-3">
            <div className="bg-neutral-800/50 rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                  code_verifier
                </span>
                <CopyButton text={state.codeVerifier} />
              </div>
              <code className="text-xs font-mono text-orange-400 break-all block">
                {state.codeVerifier}
              </code>
              <p className="text-[10px] text-neutral-600">
                64 random bytes, base64url-encoded. Kept secret — never sent to the authorization
                endpoint.
              </p>
            </div>

            <div className="flex items-center justify-center text-neutral-600 text-xs gap-1">
              <ChevronDown className="h-3 w-3" /> SHA-256 + base64url
            </div>

            <div className="bg-neutral-800/50 rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                  code_challenge
                </span>
                <CopyButton text={state.codeChallenge} />
              </div>
              <code className="text-xs font-mono text-purple-400 break-all block">
                {state.codeChallenge}
              </code>
              <p className="text-[10px] text-neutral-600">
                Sent to the authorization endpoint. The provider verifies it against the verifier
                during token exchange.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-800/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                    state
                  </span>
                  <CopyButton text={state.stateParam} />
                </div>
                <code className="text-[10px] font-mono text-blue-400 break-all block">
                  {state.stateParam}
                </code>
                <p className="text-[10px] text-neutral-600">CSRF protection</p>
              </div>

              <div className="bg-neutral-800/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                    nonce
                  </span>
                  <CopyButton text={state.nonce} />
                </div>
                <code className="text-[10px] font-mono text-teal-400 break-all block">
                  {state.nonce}
                </code>
                <p className="text-[10px] text-neutral-600">Replay protection</p>
              </div>
            </div>
          </div>

          {state.currentStep === 1 && (
            <div className="flex gap-3">
              <button
                onClick={handleGeneratePkce}
                className="flex-1 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </button>
              <button
                onClick={() => dispatch({ type: 'ADVANCE_STEP' })}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors"
              >
                Continue
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )

  const renderStep2 = () => {
    const authParams: Record<string, string> = {
      response_type: 'code',
      client_id: state.clientId,
      redirect_uri: state.redirectUri,
      scope: state.scopes,
      state: state.stateParam,
      nonce: state.nonce,
      code_challenge: state.codeChallenge,
      code_challenge_method: 'S256',
      ...(provider.extraAuthParams ?? {}),
    }

    const fullUrl = `${state.authorizationUrl}?${new URLSearchParams(authParams).toString()}`

    return (
      <div className="space-y-4 pt-4">
        <div className="bg-neutral-800/50 rounded-lg p-3">
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">
            Authorization Endpoint
          </div>
          <code className="text-xs font-mono text-neutral-200 break-all">
            {state.authorizationUrl}
          </code>
        </div>

        <div className="bg-neutral-800/50 rounded-lg p-3">
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">
            Query Parameters
          </div>
          <div className="divide-y divide-neutral-800/50">
            <ParamRow
              label="response_type"
              value="code"
              description="Requesting an authorization code"
            />
            <ParamRow label="client_id" value={state.clientId} source="Step 1" />
            <ParamRow label="redirect_uri" value={state.redirectUri} source="Step 1" />
            <ParamRow label="scope" value={state.scopes} source="Step 1" />
            <ParamRow
              label="state"
              value={state.stateParam}
              source="Step 2"
              description="Verified on callback to prevent CSRF"
            />
            <ParamRow
              label="nonce"
              value={state.nonce}
              source="Step 2"
              description="Included in ID token to prevent replay"
            />
            <ParamRow
              label="code_challenge"
              value={state.codeChallenge}
              source="Step 2"
              description="SHA-256 hash of code_verifier"
            />
            <ParamRow label="code_challenge_method" value="S256" />
            {provider.extraAuthParams &&
              Object.entries(provider.extraAuthParams).map(([key, val]) => (
                <ParamRow key={key} label={key} value={val} source="Provider config" />
              ))}
          </div>
        </div>

        <div className="bg-neutral-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
              Full URL Preview
            </div>
            <CopyButton text={fullUrl} />
          </div>
          <div className="max-h-24 overflow-y-auto">
            <code className="text-[10px] font-mono text-emerald-400 break-all leading-relaxed">
              {fullUrl}
            </code>
          </div>
        </div>

        {state.currentStep === 2 && (
          <button
            onClick={handleRedirect}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Redirect to Provider
          </button>
        )}
      </div>
    )
  }

  const renderStep3 = () => {
    const stateMatches = state.callbackState === state.stateParam

    return (
      <div className="space-y-4 pt-4">
        <p className="text-sm text-neutral-400">
          The provider redirected back with an authorization code. Let's verify the state parameter
          and extract the code.
        </p>

        <div className="bg-neutral-800/50 rounded-lg p-3 space-y-3">
          <div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
              Authorization Code
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-emerald-400 break-all flex-1">
                {state.callbackCode}
              </code>
              <CopyButton text={state.callbackCode} />
            </div>
          </div>

          <div className="border-t border-neutral-700/50 pt-3">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">
              State Verification
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-[10px] text-neutral-500 w-16 flex-shrink-0 pt-0.5">
                  Sent:
                </span>
                <code className="text-[10px] font-mono text-blue-400 break-all">
                  {state.stateParam}
                </code>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[10px] text-neutral-500 w-16 flex-shrink-0 pt-0.5">
                  Received:
                </span>
                <code className="text-[10px] font-mono text-blue-400 break-all">
                  {state.callbackState}
                </code>
              </div>
              <div
                className={cn(
                  'flex items-center gap-2 text-xs font-medium mt-1',
                  stateMatches ? 'text-emerald-400' : 'text-red-400',
                )}
              >
                {stateMatches ? (
                  <>
                    <Check className="h-4 w-4" /> State matches — no CSRF detected
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" /> State mismatch — possible CSRF attack!
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => dispatch({ type: 'ADVANCE_STEP' })}
          disabled={!stateMatches}
          className={cn(
            'w-full py-2.5 rounded-lg font-medium text-sm transition-colors',
            stateMatches
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed',
          )}
        >
          Continue
        </button>
      </div>
    )
  }

  const renderStep4 = () => (
    <div className="space-y-4 pt-4">
      <div className="bg-neutral-800/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-400">
            POST
          </span>
          <code className="text-xs font-mono text-neutral-200 break-all">{state.tokenUrl}</code>
        </div>

        <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">Headers</div>
        <div className="bg-neutral-900/50 rounded p-2 mb-3">
          <code className="text-[10px] font-mono">
            <span className="text-cyan-400">Content-Type</span>
            <span className="text-neutral-600">: </span>
            <span className="text-neutral-300">application/x-www-form-urlencoded</span>
          </code>
        </div>

        <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">
          Body Parameters
        </div>
        <div className="divide-y divide-neutral-800/50">
          <ParamRow label="grant_type" value="authorization_code" />
          <ParamRow label="code" value={state.callbackCode} source="Step 4" />
          <ParamRow label="client_id" value={state.clientId} source="Step 1" />
          <ParamRow label="redirect_uri" value={state.redirectUri} source="Step 1" />
          <ParamRow
            label="code_verifier"
            value={state.codeVerifier}
            source="Step 2"
            description="The provider will SHA-256 hash this and compare to the code_challenge from step 3"
          />
        </div>
      </div>

      {state.tokenResponse && (
        <div className="bg-neutral-800/50 rounded-lg p-3">
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">
            Response
          </div>
          <SyntaxHighlight code={toJsonString(state.tokenResponse)} />
        </div>
      )}

      {state.error && state.currentStep === 4 && (
        <div className="p-3 rounded-lg bg-red-900/20 border border-red-800/40">
          <p className="text-sm text-red-400">{state.error}</p>
        </div>
      )}

      {!state.tokenResponse && (
        <button
          onClick={handleExchangeTokens}
          disabled={state.exchangeLoading}
          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.exchangeLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Exchanging...
            </>
          ) : state.error ? (
            <>
              <RefreshCw className="h-4 w-4" /> Retry Exchange
            </>
          ) : (
            <>
              <Key className="h-4 w-4" /> Exchange Code for Tokens
            </>
          )}
        </button>
      )}
    </div>
  )

  const renderStep5 = () => (
    <div className="space-y-4 pt-4">
      <p className="text-sm text-emerald-400 font-medium">
        Flow complete! Here are your decoded tokens:
      </p>

      {state.tokens.id_token && <JwtDecoder token={state.tokens.id_token} label="ID Token" />}

      {state.tokens.access_token && (
        <JwtDecoder token={state.tokens.access_token} label="Access Token" />
      )}

      {state.tokens.refresh_token && (
        <div className="bg-neutral-800 rounded-lg border border-neutral-700 p-3">
          <div className="text-xs text-neutral-500 mb-1">Refresh Token</div>
          <code className="text-xs text-neutral-300 break-all">{state.tokens.refresh_token}</code>
        </div>
      )}
    </div>
  )

  const stepRenderers = [
    renderStep0,
    renderStep1,
    renderStep2,
    renderStep3,
    renderStep4,
    renderStep5,
  ]

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900/80 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-lg font-semibold">OAuth Playground</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              Auth Code + PKCE
            </span>
          </div>
          {state.currentStep > 0 && (
            <button
              onClick={handleReset}
              className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-3">
        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-6">
          {STEP_TITLES.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i < state.currentStep
                  ? 'bg-emerald-500'
                  : i === state.currentStep
                    ? 'bg-emerald-500/40'
                    : 'bg-neutral-800',
              )}
            />
          ))}
        </div>

        {state.error && (
          <div className="p-3 rounded-lg bg-red-900/20 border border-red-800/40">
            <p className="text-sm text-red-400">{state.error}</p>
          </div>
        )}

        {STEP_TITLES.map((_, i) => (
          <StepCard
            key={i}
            stepIndex={i}
            currentStep={state.currentStep}
            isExpanded={state.expandedSteps.includes(i)}
            onToggle={() => dispatch({ type: 'TOGGLE_STEP', step: i })}
          >
            {stepRenderers[i]()}
          </StepCard>
        ))}

        <div className="pt-4">
          <SecurityWarnings onClearCredentials={handleReset} />
        </div>
      </div>
    </div>
  )
}
