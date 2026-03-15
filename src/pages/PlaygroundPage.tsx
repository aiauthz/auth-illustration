import { useState, useReducer, useEffect, useCallback, useRef } from 'react'
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
  AlertTriangle,
} from 'lucide-react'
import confetti from 'canvas-confetti'

import { ProviderSelector } from '@/components/playground/ProviderSelector'
import { FlowSelector } from '@/components/playground/FlowSelector'
import { JwtDecoder } from '@/components/playground/JwtDecoder'
import { SecurityWarnings } from '@/components/playground/SecurityWarnings'
import { SyntaxHighlight, toJsonString } from '@/components/SyntaxHighlight'

import {
  PROVIDERS,
  buildOidcUrls,
  type OAuthProviderConfig,
  type OAuthFlowType,
} from '@/lib/providers'
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
import {
  exchangeCodeForTokens,
  exchangeCodeWithSecret,
  exchangeClientCredentials,
} from '@/services/oauthFlow'
import { cn } from '@/lib/utils'

// ─── Flow Step Definitions ──────────────────────────────────────

type StepRenderKey = 'setup' | 'security' | 'authUrl' | 'callback' | 'exchange' | 'decode'

interface FlowStepDef {
  title: string
  icon: typeof Globe
  render: StepRenderKey
}

const FLOW_STEPS: Record<OAuthFlowType, FlowStepDef[]> = {
  authorization_code_pkce: [
    { title: 'Choose Provider & Flow', icon: Globe, render: 'setup' },
    { title: 'Generate PKCE', icon: Shield, render: 'security' },
    { title: 'Build Authorization URL', icon: Code2, render: 'authUrl' },
    { title: 'Handle Callback', icon: ExternalLink, render: 'callback' },
    { title: 'Exchange Code for Tokens', icon: Key, render: 'exchange' },
    { title: 'Decode Tokens', icon: Sparkles, render: 'decode' },
  ],
  authorization_code: [
    { title: 'Choose Provider & Flow', icon: Globe, render: 'setup' },
    { title: 'Generate State & Nonce', icon: Shield, render: 'security' },
    { title: 'Build Authorization URL', icon: Code2, render: 'authUrl' },
    { title: 'Handle Callback', icon: ExternalLink, render: 'callback' },
    { title: 'Exchange Code for Tokens', icon: Key, render: 'exchange' },
    { title: 'Decode Tokens', icon: Sparkles, render: 'decode' },
  ],
  client_credentials: [
    { title: 'Choose Provider & Flow', icon: Globe, render: 'setup' },
    { title: 'Exchange Credentials for Token', icon: Key, render: 'exchange' },
    { title: 'Decode Tokens', icon: Sparkles, render: 'decode' },
  ],
  implicit: [
    { title: 'Choose Provider & Flow', icon: Globe, render: 'setup' },
    { title: 'Generate State & Nonce', icon: Shield, render: 'security' },
    { title: 'Build Authorization URL', icon: Code2, render: 'authUrl' },
    { title: 'Handle Callback (Fragment)', icon: ExternalLink, render: 'callback' },
    { title: 'Decode Tokens', icon: Sparkles, render: 'decode' },
  ],
}

const FLOW_BADGES: Record<OAuthFlowType, { label: string; className: string }> = {
  authorization_code_pkce: {
    label: 'Auth Code + PKCE',
    className: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
  },
  authorization_code: {
    label: 'Auth Code',
    className: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
  },
  client_credentials: {
    label: 'Client Credentials',
    className: 'bg-purple-600/20 text-purple-400 border-purple-500/30',
  },
  implicit: {
    label: 'Implicit (Deprecated)',
    className: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
  },
}

// ─── State Types ────────────────────────────────────────────────

type StepStatus = 'locked' | 'active' | 'complete'
type TextFieldKey = 'clientId' | 'redirectUri' | 'scopes' | 'issuerUrl' | 'clientSecret'

interface PlaygroundState {
  currentStep: number
  expandedSteps: number[]
  flowType: OAuthFlowType

  // Step 0: Provider config
  providerId: string
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string
  issuerUrl: string
  authorizationUrl: string
  tokenUrl: string

  // Security params
  codeVerifier: string
  codeChallenge: string
  stateParam: string
  nonce: string

  // Callback
  callbackCode: string
  callbackState: string

  // Token exchange
  exchangeLoading: boolean
  tokenResponse: Record<string, unknown> | null

  // Tokens
  tokens: Record<string, string>

  error: string | null
}

type Action =
  | { type: 'SELECT_PROVIDER'; providerId: string }
  | { type: 'SELECT_FLOW'; flowType: OAuthFlowType }
  | { type: 'SET_FIELD'; field: TextFieldKey; value: string }
  | { type: 'COMPLETE_SETUP'; authorizationUrl: string; tokenUrl: string }
  | {
      type: 'SET_PKCE'
      codeVerifier: string
      codeChallenge: string
      stateParam: string
      nonce: string
    }
  | { type: 'SET_STATE_NONCE'; stateParam: string; nonce: string }
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
  const p = PROVIDERS[0]
  return {
    currentStep: 0,
    expandedSteps: [0],
    flowType: p.supportedFlows[0],
    providerId: p.id,
    clientId: '',
    clientSecret: '',
    redirectUri: callbackUrl,
    scopes: p.defaultScopes.join(' '),
    issuerUrl: '',
    authorizationUrl: p.authorizationUrl,
    tokenUrl: p.tokenUrl,
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
        flowType: provider.supportedFlows[0],
        scopes: provider.defaultScopes.join(' '),
        authorizationUrl: provider.authorizationUrl,
        tokenUrl: provider.tokenUrl,
        issuerUrl: '',
        clientSecret: '',
        error: null,
      }
    }

    case 'SELECT_FLOW':
      return { ...state, flowType: action.flowType, clientSecret: '', error: null }

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

    case 'SET_STATE_NONCE':
      return {
        ...state,
        stateParam: action.stateParam,
        nonce: action.nonce,
      }

    case 'ADVANCE_STEP': {
      const maxStep = FLOW_STEPS[state.flowType].length - 1
      if (state.currentStep >= maxStep) return state
      const next = state.currentStep + 1
      return { ...state, currentStep: next, expandedSteps: [next], error: null }
    }

    case 'SET_EXCHANGE_LOADING':
      return { ...state, exchangeLoading: action.loading, error: null }

    case 'SET_TOKEN_RESPONSE': {
      const lastStep = FLOW_STEPS[state.flowType].length - 1
      return {
        ...state,
        tokenResponse: action.response,
        tokens: action.tokens,
        exchangeLoading: false,
        currentStep: lastStep,
        expandedSteps: [lastStep],
      }
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
  title,
  icon: Icon,
  currentStep,
  isExpanded,
  onToggle,
  children,
}: {
  stepIndex: number
  title: string
  icon: typeof Globe
  currentStep: number
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const status = getStepStatus(stepIndex, currentStep)

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

function WarningBanner({
  children,
  variant = 'amber',
}: {
  children: React.ReactNode
  variant?: 'amber' | 'red'
}) {
  const colors =
    variant === 'red'
      ? 'bg-red-900/20 border-red-800/40 text-red-400'
      : 'bg-amber-900/20 border-amber-800/40 text-amber-400'
  return (
    <div className={cn('p-3 rounded-lg border flex items-start gap-2 text-xs', colors)}>
      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────

export function PlaygroundPage() {
  const [searchParams] = useSearchParams()
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState)
  const confettiFired = useRef(false)

  const provider = PROVIDERS.find((p) => p.id === state.providerId) ?? PROVIDERS[0]
  const steps = FLOW_STEPS[state.flowType]
  const badge = FLOW_BADGES[state.flowType]
  const isPkce = state.flowType === 'authorization_code_pkce'
  const isAuthCode = state.flowType === 'authorization_code'
  const isClientCreds = state.flowType === 'client_credentials'
  const isImplicit = state.flowType === 'implicit'
  const needsSecret = isAuthCode || isClientCreds

  // Confetti on reaching decode step with tokens
  useEffect(() => {
    const lastStep = steps.length - 1
    if (
      state.currentStep === lastStep &&
      Object.keys(state.tokens).length > 0 &&
      !confettiFired.current
    ) {
      confettiFired.current = true
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#22c55e', '#6ee7b7', '#059669'],
      })
    }
  }, [state.currentStep, state.tokens, steps.length])

  // Resume flow after redirect
  const resumeFlow = useCallback(() => {
    const callbackData = sessionStorage.getItem('oauth_playground_callback')
    if (!callbackData) return

    let parsed: Record<string, string>
    try {
      parsed = JSON.parse(callbackData)
    } catch {
      sessionStorage.removeItem('oauth_playground_callback')
      dispatch({ type: 'SET_ERROR', error: 'Invalid callback data in session storage' })
      return
    }
    sessionStorage.removeItem('oauth_playground_callback')

    const flowState = restoreFlowState()
    if (!flowState) {
      dispatch({ type: 'SET_ERROR', error: 'No pending flow state found' })
      return
    }

    const restoredFlowType = (flowState.flowType as OAuthFlowType) || 'authorization_code_pkce'
    const restoredSteps = FLOW_STEPS[restoredFlowType]
    const callbackStepIndex = restoredSteps.findIndex((s) => s.render === 'callback')

    if (callbackStepIndex === -1) {
      dispatch({ type: 'SET_ERROR', error: 'This flow type does not support redirect callbacks' })
      return
    }

    if (parsed.flowType === 'implicit') {
      // Implicit: tokens already in callback data
      const tokens: Record<string, string> = {}
      if (parsed.access_token) tokens.access_token = parsed.access_token
      if (parsed.id_token) tokens.id_token = parsed.id_token

      dispatch({
        type: 'RESTORE',
        state: {
          flowType: restoredFlowType,
          currentStep: callbackStepIndex,
          expandedSteps: [callbackStepIndex],
          providerId: flowState.providerId,
          clientId: flowState.clientId,
          redirectUri: flowState.redirectUri,
          scopes: flowState.scopes.join(' '),
          authorizationUrl: flowState.authorizationUrl,
          tokenUrl: flowState.tokenUrl,
          stateParam: flowState.state,
          nonce: flowState.nonce ?? '',
          callbackState: parsed.state || '',
          tokens,
        },
      })
    } else {
      // Auth code: extract code and state
      if (!parsed.code || !parsed.state) {
        dispatch({ type: 'SET_ERROR', error: 'Missing code or state in callback data' })
        return
      }

      let clientSecret = ''
      if (flowState.playgroundSnapshot) {
        try {
          clientSecret = JSON.parse(flowState.playgroundSnapshot).clientSecret ?? ''
        } catch {
          // ignore
        }
      }

      dispatch({
        type: 'RESTORE',
        state: {
          flowType: restoredFlowType,
          currentStep: callbackStepIndex,
          expandedSteps: [callbackStepIndex],
          providerId: flowState.providerId,
          clientId: flowState.clientId,
          clientSecret,
          redirectUri: flowState.redirectUri,
          scopes: flowState.scopes.join(' '),
          authorizationUrl: flowState.authorizationUrl,
          tokenUrl: flowState.tokenUrl,
          codeVerifier: flowState.codeVerifier ?? '',
          codeChallenge: flowState.codeChallenge ?? '',
          stateParam: flowState.state,
          nonce: flowState.nonce ?? '',
          callbackCode: parsed.code,
          callbackState: parsed.state,
        },
      })
    }

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

    if (needsSecret && !state.clientSecret.trim()) {
      dispatch({ type: 'SET_ERROR', error: 'Client Secret is required for this flow' })
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

    if (isClientCreds) {
      if (!tokUrl) {
        dispatch({ type: 'SET_ERROR', error: 'Token URL is required' })
        return
      }
    } else {
      if (!authUrl || !tokUrl) {
        dispatch({
          type: 'SET_ERROR',
          error: 'Authorization URL and Token URL are required',
        })
        return
      }
    }

    dispatch({ type: 'COMPLETE_SETUP', authorizationUrl: authUrl, tokenUrl: tokUrl })
  }

  const handleGeneratePkce = async () => {
    const verifier = generateCodeVerifier()
    const challenge = await generateCodeChallenge(verifier)
    dispatch({
      type: 'SET_PKCE',
      codeVerifier: verifier,
      codeChallenge: challenge,
      stateParam: generateState(),
      nonce: generateNonce(),
    })
  }

  const handleGenerateStateNonce = () => {
    dispatch({
      type: 'SET_STATE_NONCE',
      stateParam: generateState(),
      nonce: generateNonce(),
    })
  }

  const handleRedirect = () => {
    const responseType = isImplicit ? 'token' : 'code'
    const params: Record<string, string> = {
      response_type: responseType,
      client_id: state.clientId,
      redirect_uri: state.redirectUri,
      scope: state.scopes,
      state: state.stateParam,
      nonce: state.nonce,
      ...(provider.extraAuthParams ?? {}),
    }
    if (isPkce) {
      params.code_challenge = state.codeChallenge
      params.code_challenge_method = 'S256'
    }

    const authUrl = `${state.authorizationUrl}?${new URLSearchParams(params).toString()}`

    const flowState: StoredFlowState = {
      flowId: state.stateParam,
      providerId: provider.id,
      flowType: state.flowType,
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
        flowType: state.flowType,
        clientSecret: state.clientSecret,
      }),
    }
    saveFlowState(flowState)

    window.location.href = authUrl
  }

  const handleExchangeTokens = async () => {
    dispatch({ type: 'SET_EXCHANGE_LOADING', loading: true })

    try {
      let tokens: Record<string, unknown> | null = null
      let error: string | undefined

      if (isPkce) {
        const r = await exchangeCodeForTokens(
          state.tokenUrl,
          state.callbackCode,
          state.clientId,
          state.redirectUri,
          state.codeVerifier,
        )
        tokens = r.tokens
        error = r.error
      } else if (isAuthCode) {
        const r = await exchangeCodeWithSecret(
          state.tokenUrl,
          state.callbackCode,
          state.clientId,
          state.redirectUri,
          state.clientSecret,
        )
        tokens = r.tokens
        error = r.error
      } else if (isClientCreds) {
        const r = await exchangeClientCredentials(
          state.tokenUrl,
          state.clientId,
          state.clientSecret,
          state.scopes,
        )
        tokens = r.tokens
        error = r.error
      } else {
        dispatch({ type: 'SET_ERROR', error: 'Token exchange is not supported for this flow type' })
        return
      }

      if (error) {
        dispatch({ type: 'SET_ERROR', error })
        return
      }
      if (!tokens) {
        dispatch({ type: 'SET_ERROR', error: 'No tokens received from provider' })
        return
      }

      const received: Record<string, string> = {}
      if (tokens.access_token) received.access_token = String(tokens.access_token)
      if (tokens.id_token) received.id_token = String(tokens.id_token)
      if (tokens.refresh_token) received.refresh_token = String(tokens.refresh_token)

      dispatch({ type: 'SET_TOKEN_RESPONSE', response: tokens, tokens: received })
      clearFlowState()
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
    confettiFired.current = false
    dispatch({ type: 'RESET' })
  }

  // ─── Step Renderers ─────────────────────────────────────────

  const isSetupActive = state.currentStep === 0

  const renderSetup = () => (
    <form
      className="space-y-4 pt-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (isSetupActive) handleCompleteStep0()
      }}
    >
      <div className={cn(!isSetupActive && 'pointer-events-none opacity-60')}>
        <ProviderSelector
          selectedId={state.providerId}
          onSelect={(p: OAuthProviderConfig) =>
            dispatch({ type: 'SELECT_PROVIDER', providerId: p.id })
          }
        />
      </div>

      <div className={cn(!isSetupActive && 'pointer-events-none opacity-60')}>
        <FlowSelector
          supportedFlows={provider.supportedFlows}
          selectedFlow={state.flowType}
          onSelect={(f) => dispatch({ type: 'SELECT_FLOW', flowType: f })}
        />
      </div>

      {isImplicit && (
        <WarningBanner>
          The implicit flow is deprecated and insecure. Tokens are exposed in the URL fragment and
          browser history. Use Auth Code + PKCE for new applications.
        </WarningBanner>
      )}

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

      {needsSecret && (
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">Client Secret</label>
          <input
            type="password"
            value={state.clientSecret}
            onChange={(e) =>
              dispatch({ type: 'SET_FIELD', field: 'clientSecret', value: e.target.value })
            }
            placeholder="Your OAuth client secret"
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-500/50 focus:outline-none"
          />
          <p className="text-[10px] text-amber-500/80 mt-1">
            For educational purposes only. Never expose client secrets in browser-side code in
            production.
          </p>
        </div>
      )}

      {!isClientCreds && (
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
      )}

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

      {isSetupActive ? (
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

  const renderSecurity = () => {
    const hasValues = !!state.stateParam
    const isActive = steps.findIndex((s) => s.render === 'security') === state.currentStep

    if (!hasValues) {
      return (
        <div className="space-y-4 pt-4">
          <p className="text-sm text-neutral-400">
            {isPkce
              ? 'PKCE (Proof Key for Code Exchange) prevents authorization code interception. Generate a cryptographically random code verifier and its SHA-256 challenge.'
              : 'Generate cryptographic parameters for CSRF and replay protection.'}
          </p>
          <button
            onClick={isPkce ? handleGeneratePkce : handleGenerateStateNonce}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {isPkce ? 'Generate PKCE Values' : 'Generate Security Parameters'}
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-4 pt-4">
        <div className="space-y-3">
          {isPkce && (
            <>
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
            </>
          )}

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

        {isActive && (
          <div className="flex gap-3">
            <button
              onClick={isPkce ? handleGeneratePkce : handleGenerateStateNonce}
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
      </div>
    )
  }

  const renderAuthUrl = () => {
    const responseType = isImplicit ? 'token' : 'code'
    const authParams: Record<string, string> = {
      response_type: responseType,
      client_id: state.clientId,
      redirect_uri: state.redirectUri,
      scope: state.scopes,
      state: state.stateParam,
      nonce: state.nonce,
      ...(provider.extraAuthParams ?? {}),
    }
    if (isPkce) {
      authParams.code_challenge = state.codeChallenge
      authParams.code_challenge_method = 'S256'
    }

    const fullUrl = `${state.authorizationUrl}?${new URLSearchParams(authParams).toString()}`
    const isActive =
      steps.findIndex((s) => s.render === 'authUrl') === state.currentStep

    return (
      <div className="space-y-4 pt-4">
        {isImplicit && (
          <WarningBanner>
            The implicit flow returns tokens directly in the URL fragment. They will be visible in
            your browser history and to any JavaScript on the page.
          </WarningBanner>
        )}

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
              value={responseType}
              description={
                isImplicit
                  ? 'Requesting tokens directly (no authorization code)'
                  : 'Requesting an authorization code'
              }
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
            {isPkce && (
              <>
                <ParamRow
                  label="code_challenge"
                  value={state.codeChallenge}
                  source="Step 2"
                  description="SHA-256 hash of code_verifier"
                />
                <ParamRow label="code_challenge_method" value="S256" />
              </>
            )}
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

        {isActive && (
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

  const renderCallback = () => {
    const stateMatches = state.callbackState === state.stateParam
    const isActive =
      steps.findIndex((s) => s.render === 'callback') === state.currentStep

    return (
      <div className="space-y-4 pt-4">
        <p className="text-sm text-neutral-400">
          {isImplicit
            ? 'The provider redirected back with tokens in the URL fragment. Let\u2019s verify the state parameter and examine the tokens.'
            : 'The provider redirected back with an authorization code. Let\u2019s verify the state parameter and extract the code.'}
        </p>

        <div className="bg-neutral-800/50 rounded-lg p-3 space-y-3">
          {isImplicit ? (
            <div className="space-y-2">
              {state.tokens.access_token && (
                <div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                    Access Token (from fragment)
                  </div>
                  <code className="text-xs font-mono text-emerald-400 break-all block">
                    {state.tokens.access_token.length > 80
                      ? `${state.tokens.access_token.substring(0, 80)}...`
                      : state.tokens.access_token}
                  </code>
                </div>
              )}
              {state.tokens.id_token && (
                <div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                    ID Token (from fragment)
                  </div>
                  <code className="text-xs font-mono text-emerald-400 break-all block">
                    {state.tokens.id_token.substring(0, 80)}...
                  </code>
                </div>
              )}
            </div>
          ) : (
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
          )}

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

        {isImplicit && (
          <WarningBanner variant="red">
            These tokens were transmitted in the URL fragment — visible in your browser history and
            to any JavaScript running on this page. This is why the implicit flow is deprecated.
          </WarningBanner>
        )}

        {isActive && (
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
        )}
      </div>
    )
  }

  const renderExchange = () => {
    const exchangeStepIndex = steps.findIndex((s) => s.render === 'exchange')
    const callbackStepNum = steps.findIndex((s) => s.render === 'callback') + 1
    const isActive = exchangeStepIndex === state.currentStep
    const corsBlocked = !provider.tokenEndpointCors

    // Build body params display
    const bodyParams: { label: string; value: string; source?: string; description?: string }[] =
      []

    if (isClientCreds) {
      bodyParams.push(
        { label: 'grant_type', value: 'client_credentials' },
        { label: 'client_id', value: state.clientId, source: 'Step 1' },
        {
          label: 'client_secret',
          value: state.clientSecret ? '\u2022'.repeat(12) : '',
          source: 'Step 1',
        },
        { label: 'scope', value: state.scopes, source: 'Step 1' },
      )
    } else {
      bodyParams.push(
        { label: 'grant_type', value: 'authorization_code' },
        {
          label: 'code',
          value: state.callbackCode,
          source: `Step ${callbackStepNum}`,
        },
        { label: 'client_id', value: state.clientId, source: 'Step 1' },
        { label: 'redirect_uri', value: state.redirectUri, source: 'Step 1' },
      )
      if (isPkce) {
        bodyParams.push({
          label: 'code_verifier',
          value: state.codeVerifier,
          source: 'Step 2',
          description:
            'The provider will SHA-256 hash this and compare to the code_challenge from the authorization request',
        })
      } else {
        bodyParams.push({
          label: 'client_secret',
          value: state.clientSecret ? '\u2022'.repeat(12) : '',
          source: 'Step 1',
          description: 'Proves the client is the legitimate owner of the client_id',
        })
      }
    }

    return (
      <div className="space-y-4 pt-4">
        {corsBlocked && (
          <WarningBanner>
            This provider's token endpoint blocks CORS requests from browsers. The exchange will
            likely fail with a network error. In production, this request happens server-side.
          </WarningBanner>
        )}

        <div className="bg-neutral-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-400">
              POST
            </span>
            <code className="text-xs font-mono text-neutral-200 break-all">
              {state.tokenUrl}
            </code>
          </div>

          <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">
            Headers
          </div>
          <div className="bg-neutral-900/50 rounded p-2 mb-3 space-y-1">
            <code className="text-[10px] font-mono block">
              <span className="text-cyan-400">Content-Type</span>
              <span className="text-neutral-600">: </span>
              <span className="text-neutral-300">application/x-www-form-urlencoded</span>
            </code>
            {(isAuthCode || isClientCreds) && (
              <code className="text-[10px] font-mono block">
                <span className="text-cyan-400">Accept</span>
                <span className="text-neutral-600">: </span>
                <span className="text-neutral-300">application/json</span>
              </code>
            )}
          </div>

          <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">
            Body Parameters
          </div>
          <div className="divide-y divide-neutral-800/50">
            {bodyParams.map((p) => (
              <ParamRow key={p.label} {...p} />
            ))}
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

        {state.error && isActive && (
          <div className="p-3 rounded-lg bg-red-900/20 border border-red-800/40">
            <p className="text-sm text-red-400">{state.error}</p>
          </div>
        )}

        {!state.tokenResponse && isActive && (
          <button
            onClick={handleExchangeTokens}
            disabled={state.exchangeLoading}
            className={cn(
              'w-full py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
              corsBlocked
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white',
            )}
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
                <Key className="h-4 w-4" />
                {corsBlocked ? 'Try Exchange (may fail due to CORS)' : 'Exchange'}
              </>
            )}
          </button>
        )}
      </div>
    )
  }

  const renderDecode = () => (
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

      {Object.keys(state.tokens).length === 0 && (
        <p className="text-sm text-neutral-500">No tokens received.</p>
      )}
    </div>
  )

  const renderers: Record<StepRenderKey, () => React.ReactNode> = {
    setup: renderSetup,
    security: renderSecurity,
    authUrl: renderAuthUrl,
    callback: renderCallback,
    exchange: renderExchange,
    decode: renderDecode,
  }

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
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded border',
                badge.className,
              )}
            >
              {badge.label}
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
          {steps.map((_, i) => (
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

        {state.error && steps[state.currentStep]?.render !== 'exchange' && (
          <div className="p-3 rounded-lg bg-red-900/20 border border-red-800/40">
            <p className="text-sm text-red-400">{state.error}</p>
          </div>
        )}

        {steps.map((step, i) => (
          <StepCard
            key={`${state.flowType}-${i}`}
            stepIndex={i}
            title={step.title}
            icon={step.icon}
            currentStep={state.currentStep}
            isExpanded={state.expandedSteps.includes(i)}
            onToggle={() => dispatch({ type: 'TOGGLE_STEP', step: i })}
          >
            {renderers[step.render]()}
          </StepCard>
        ))}

        <div className="pt-4">
          <SecurityWarnings onClearCredentials={handleReset} />
        </div>
      </div>
    </div>
  )
}
