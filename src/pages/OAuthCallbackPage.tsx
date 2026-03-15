import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { restoreFlowState } from '@/lib/flowState'
import { Loader2, AlertCircle } from 'lucide-react'

/**
 * OAuth callback handler.
 * Captures the authorization code and state from the redirect,
 * validates state, stores callback data, and redirects to playground.
 */
export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const errorParam = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle provider errors
    if (errorParam) {
      setError(`${errorParam}: ${errorDescription || 'Unknown error from provider'}`)
      return
    }

    if (!code || !state) {
      setError('Missing code or state parameter in callback URL')
      return
    }

    // Validate state against stored flow
    const flowState = restoreFlowState()
    if (!flowState) {
      setError('No pending OAuth flow found. The flow may have expired or been cleared.')
      return
    }

    if (flowState.state !== state) {
      setError(
        'State parameter mismatch. This may indicate a CSRF attack or the flow was started in a different tab.',
      )
      return
    }

    // Reject stale flows (older than 15 minutes)
    const MAX_FLOW_AGE_MS = 15 * 60 * 1000
    if (Date.now() - flowState.startedAt > MAX_FLOW_AGE_MS) {
      setError('This OAuth flow has expired. Please start a new flow from the playground.')
      return
    }

    // Store callback data and redirect to playground
    sessionStorage.setItem(
      'oauth_playground_callback',
      JSON.stringify({
        code,
        state,
        receivedAt: Date.now(),
      }),
    )

    navigate('/playground?flow=resume', { replace: true })
  }, [searchParams, navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="max-w-md w-full mx-4 p-6 bg-neutral-900 rounded-lg border border-red-800/50">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
            <h2 className="text-lg font-semibold text-red-300">OAuth Error</h2>
          </div>
          <p className="text-sm text-neutral-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/playground')}
            className="px-4 py-2 bg-neutral-800 text-neutral-200 rounded-md text-sm hover:bg-neutral-700 transition-colors"
          >
            Back to Playground
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="flex items-center gap-3 text-neutral-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Processing OAuth callback...</span>
      </div>
    </div>
  )
}
