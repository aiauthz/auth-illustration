import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { ProviderSelector } from '@/components/playground/ProviderSelector'
import { FlowSelector } from '@/components/playground/FlowSelector'
import { CredentialForm, type CredentialFormData } from '@/components/playground/CredentialForm'
import { FlowTimeline, type TimelineStep } from '@/components/playground/FlowTimeline'
import { JwtDecoder } from '@/components/playground/JwtDecoder'
import { SecurityWarnings } from '@/components/playground/SecurityWarnings'

import { PROVIDERS, buildOidcUrls, type OAuthProviderConfig, type OAuthFlowType } from '@/lib/providers'
import { restoreFlowState, clearFlowState, clearAllPlaygroundData } from '@/lib/flowState'
import { startAuthCodePkceFlow, exchangeCodeForTokens, type FlowEvent } from '@/services/oauthFlow'
import type { HttpRequestEntry } from '@/components/HttpRequestPanel'
import { HttpRequestPanel } from '@/components/HttpRequestPanel'

import { cn } from '@/lib/utils'
import { Terminal, X } from 'lucide-react'

type PlaygroundPhase = 'setup' | 'running' | 'complete' | 'error'

export function PlaygroundPage() {
  const [searchParams] = useSearchParams()

  // Provider & flow selection
  const [provider, setProvider] = useState<OAuthProviderConfig>(PROVIDERS[0])
  const [flowType, setFlowType] = useState<OAuthFlowType>('authorization_code_pkce')

  // Flow state
  const [phase, setPhase] = useState<PlaygroundPhase>('setup')
  const [events, setEvents] = useState<FlowEvent[]>([])
  const [httpEntries, setHttpEntries] = useState<HttpRequestEntry[]>([])
  const [tokens, setTokens] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [showTerminal, setShowTerminal] = useState(false)

  // Resume flow after redirect
  const resumeFlow = useCallback(async () => {
    const callbackData = sessionStorage.getItem('oauth_playground_callback')
    if (!callbackData) return

    const { code } = JSON.parse(callbackData)
    sessionStorage.removeItem('oauth_playground_callback')

    const flowState = restoreFlowState()
    if (!flowState) {
      setError('No pending flow state found')
      setPhase('error')
      return
    }

    // Restore pre-redirect events
    const preEvents: FlowEvent[] = JSON.parse(flowState.preRedirectLog || '[]')
    setEvents(preEvents)

    const preHttpEntries = preEvents
      .filter((e): e is FlowEvent & { httpEntry: HttpRequestEntry } => !!e.httpEntry)
      .map((e) => e.httpEntry)
    setHttpEntries(preHttpEntries)

    setPhase('running')

    // Add callback received event
    const callbackEvent: FlowEvent = {
      type: 'step',
      stepId: 'callback_received',
      label: `Authorization code received: ${code.substring(0, 12)}...`,
    }
    setEvents((prev) => [...prev, callbackEvent])

    // Token exchange
    try {
      const result = await exchangeCodeForTokens(
        flowState.tokenUrl,
        code,
        flowState.clientId,
        flowState.redirectUri,
        flowState.codeVerifier || '',
      )

      setHttpEntries((prev) => [...prev, result.httpEntry])
      setEvents((prev) => [
        ...prev,
        {
          type: 'http_request',
          stepId: 'token_exchange',
          label: 'Exchange code for tokens',
          httpEntry: result.httpEntry,
        },
      ])

      if (result.error) {
        setError(result.error)
        setPhase('error')
        setEvents((prev) => [
          ...prev,
          { type: 'error', stepId: 'token_error', label: result.error!, error: result.error },
        ])
      } else if (result.tokens) {
        const receivedTokens: Record<string, string> = {}
        if (result.tokens.access_token) {
          receivedTokens.access_token = String(result.tokens.access_token)
        }
        if (result.tokens.id_token) {
          receivedTokens.id_token = String(result.tokens.id_token)
        }
        if (result.tokens.refresh_token) {
          receivedTokens.refresh_token = String(result.tokens.refresh_token)
        }
        setTokens(receivedTokens)
        setPhase('complete')
        setEvents((prev) => [
          ...prev,
          { type: 'complete', stepId: 'complete', label: 'Flow complete! Tokens received.' },
        ])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Token exchange failed'
      setError(msg)
      setPhase('error')
    }

    clearFlowState()
  }, [])

  // Check for resume on mount
  useEffect(() => {
    if (searchParams.get('flow') === 'resume') {
      resumeFlow()
    }
  }, [searchParams, resumeFlow])

  const handleProviderSelect = (p: OAuthProviderConfig) => {
    setProvider(p)
    // Default to PKCE if supported
    if (p.supportedFlows.includes('authorization_code_pkce')) {
      setFlowType('authorization_code_pkce')
    } else {
      setFlowType(p.supportedFlows[0])
    }
  }

  const handleStartFlow = async (creds: CredentialFormData) => {
    setPhase('running')
    setError(null)
    setEvents([])
    setHttpEntries([])
    setTokens({})

    // Resolve URLs for Okta/Auth0 style providers
    let authorizationUrl = provider.authorizationUrl
    let tokenUrl = provider.tokenUrl
    if (creds.issuerUrl && (!authorizationUrl || !tokenUrl)) {
      const urls = buildOidcUrls(creds.issuerUrl, provider.id)
      authorizationUrl = authorizationUrl || urls.authorizationUrl
      tokenUrl = tokenUrl || urls.tokenUrl
    }

    if (!authorizationUrl || !tokenUrl) {
      setError('Authorization URL and Token URL are required')
      setPhase('error')
      return
    }

    if (flowType === 'authorization_code_pkce') {
      const flowEvents = await startAuthCodePkceFlow({
        provider,
        flowType,
        clientId: creds.clientId,
        redirectUri: creds.redirectUri,
        scopes: creds.scopes,
        authorizationUrl,
        tokenUrl,
      })

      setEvents(flowEvents)

      const newHttpEntries = flowEvents
        .filter((e): e is FlowEvent & { httpEntry: HttpRequestEntry } => !!e.httpEntry)
        .map((e) => e.httpEntry)
      setHttpEntries(newHttpEntries)

      // Find redirect event and perform redirect
      const redirectEvent = flowEvents.find((e) => e.type === 'redirect')
      if (redirectEvent?.redirectUrl) {
        // Small delay to let the UI update before navigating away
        setTimeout(() => {
          window.location.href = redirectEvent.redirectUrl!
        }, 500)
      }
    }
  }

  const handleClearCredentials = () => {
    clearAllPlaygroundData()
    setPhase('setup')
    setEvents([])
    setHttpEntries([])
    setTokens({})
    setError(null)
  }

  const handleReset = () => {
    setPhase('setup')
    setEvents([])
    setHttpEntries([])
    setTokens({})
    setError(null)
    clearFlowState()
  }

  // Build timeline steps from events
  const timelineSteps: TimelineStep[] = events.map((event, i) => ({
    id: event.stepId,
    label: event.label,
    status:
      event.type === 'error'
        ? 'error'
        : event.type === 'redirect' && phase === 'running'
          ? 'in_progress'
          : i === events.length - 1 && phase === 'running'
            ? 'in_progress'
            : 'complete',
  }))

  const showIssuerUrl = provider.needsIssuerUrl ?? false
  const callbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/playground/callback`
      : 'http://localhost:5173/playground/callback'

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900/80">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-lg font-semibold">OAuth Playground</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              Live
            </span>
          </div>
          {phase !== 'setup' && (
            <button
              onClick={handleReset}
              className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-[320px_1fr] gap-6 min-h-[calc(100vh-120px)]">
          {/* Left panel: Config */}
          <div className="space-y-5 overflow-y-auto max-h-[calc(100vh-140px)] pr-2">
            <ProviderSelector selectedId={provider.id} onSelect={handleProviderSelect} />

            <FlowSelector
              supportedFlows={provider.supportedFlows}
              selectedFlow={flowType}
              onSelect={setFlowType}
            />

            {/* Provider notes */}
            {provider.notes && (
              <div className="p-2.5 rounded-md bg-neutral-800/50 border border-neutral-700">
                <p className="text-xs text-neutral-400 leading-relaxed">{provider.notes}</p>
                {provider.docUrl && (
                  <a
                    href={provider.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-500 hover:text-emerald-400 mt-1 inline-block"
                  >
                    Documentation
                  </a>
                )}
              </div>
            )}

            {/* Redirect URI hint */}
            <div className="p-2.5 rounded-md bg-neutral-800/50 border border-neutral-700">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                Redirect URI (add this to your OAuth app)
              </p>
              <code className="text-xs text-neutral-300 break-all">{callbackUrl}</code>
            </div>

            {phase === 'setup' && (
              <CredentialForm
                flowType={flowType}
                defaultRedirectUri={callbackUrl}
                defaultScopes={provider.defaultScopes}
                onSubmit={handleStartFlow}
                showIssuerUrl={showIssuerUrl}
              />
            )}

            <SecurityWarnings onClearCredentials={handleClearCredentials} />
          </div>

          {/* Right panel: Visualization */}
          <div className="flex flex-col gap-4 min-h-0">
            {/* Timeline + Token area */}
            <div className="flex-1 grid grid-cols-[1fr_1fr] gap-4 min-h-0">
              {/* Flow Timeline */}
              <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 overflow-y-auto">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                  Flow Progress
                </h3>
                {timelineSteps.length > 0 ? (
                  <FlowTimeline steps={timelineSteps} />
                ) : (
                  <div className="text-sm text-neutral-600 mt-8 text-center">
                    Configure your OAuth app and click Start Flow to begin.
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-3 rounded-md bg-red-900/20 border border-red-800/40">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}
              </div>

              {/* Tokens / JWT Decoder */}
              <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 overflow-y-auto">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                  Tokens
                </h3>
                {Object.keys(tokens).length > 0 ? (
                  <div className="space-y-4">
                    {tokens.id_token && (
                      <JwtDecoder token={tokens.id_token} label="ID Token" />
                    )}
                    {tokens.access_token && (
                      <JwtDecoder token={tokens.access_token} label="Access Token" />
                    )}
                    {tokens.refresh_token && (
                      <div className="bg-neutral-800 rounded-lg border border-neutral-700 p-3">
                        <div className="text-xs text-neutral-500 mb-1">Refresh Token</div>
                        <code className="text-xs text-neutral-300 break-all">
                          {tokens.refresh_token}
                        </code>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-neutral-600 mt-8 text-center">
                    {phase === 'running'
                      ? 'Waiting for tokens...'
                      : 'Tokens will appear here after a successful flow.'}
                  </div>
                )}
              </div>
            </div>

            {/* HTTP Log */}
            {httpEntries.length > 0 && (
              <>
                <button
                  onClick={() => setShowTerminal((v) => !v)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors self-start',
                    showTerminal
                      ? 'bg-neutral-700 text-neutral-100 hover:bg-neutral-600'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700',
                  )}
                >
                  <Terminal className="h-4 w-4" />
                  HTTP Log
                  <span className="bg-neutral-600 text-neutral-200 text-xs px-1.5 py-0.5 rounded-full">
                    {httpEntries.length}
                  </span>
                </button>

                {showTerminal && (
                  <div className="bg-neutral-950 border border-neutral-700 rounded-lg overflow-hidden" style={{ height: '320px' }}>
                    <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
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
                    <div style={{ height: 'calc(100% - 37px)' }}>
                      <HttpRequestPanel
                        entries={httpEntries}
                        activeStepId={events[events.length - 1]?.stepId ?? ''}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
