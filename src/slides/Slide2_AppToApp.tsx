import { useState, useEffect, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Stage } from '@/stage/Stage'
import { TokenChip } from '@/components/TokenChip'
import { ConsentDialog } from '@/components/ConsentDialog'
import { HttpRequestPanel, type HttpRequestEntry } from '@/components/HttpRequestPanel'
import { ValidationIndicatorPositioned } from '@/components/ValidationIndicatorPositioned'
import { SlideLayout } from '@/components/SlideLayout'
import { Terminal, X } from 'lucide-react'
import { makeJwt } from '@/lib/tokens'
import { edgeColors } from '@/lib/colors'
import { cn } from '@/lib/utils'

type FlowStep =
  | 'idle'
  | 'calendar_to_zoom'
  | 'zoom_sso_request'
  | 'idp_validates'
  | 'id_token_received'
  | 'scope_request'
  | 'consent_shown'
  | 'access_token_issued'
  | 'api_call'
  | 'api_response'

// Step metadata for captions and sequence numbers
const stepMetadata: Record<FlowStep, { number: number; caption: string } | null> = {
  idle: null,
  calendar_to_zoom: {
    number: 1,
    caption: 'User wants to connect Calendar to Zoom - Calendar app initiates connection to access Zoom API on behalf of the user',
  },
  zoom_sso_request: {
    number: 2,
    caption: 'SSO (OIDC) - Zoom redirects to IDP (Okta) for user authentication to verify user identity',
  },
  idp_validates: {
    number: 3,
    caption: 'IDP validates user identity - Okta verifies the user credentials and validates their identity',
  },
  id_token_received: {
    number: 4,
    caption: 'ID token received - Zoom receives ID token from IDP confirming user identity',
  },
  scope_request: {
    number: 5,
    caption: 'Calendar requests scopes - Calendar app requests specific permissions (meeting.read, meeting.write) from Zoom',
  },
  consent_shown: {
    number: 6,
    caption: 'User grants consent - User approves Calendar app to access Zoom API with requested permissions',
  },
  access_token_issued: {
    number: 7,
    caption: 'Access token issued - Zoom issues its own access token to Calendar app with approved scopes',
  },
  api_call: {
    number: 8,
    caption: 'API call with token - Calendar app calls Zoom API to create a meeting, including the access token in the Authorization header',
  },
  api_response: {
    number: 9,
    caption: 'API response received - Zoom API successfully creates the meeting and returns meeting details including the join URL',
  },
}

/**
 * Slide 2: App-to-App via OAuth: Google Calendar <-> Zoom
 * Full-screen Stage-based layout
 */
export function Slide2_AppToApp() {
  const [showConsentDialog, setShowConsentDialog] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [flowStep, setFlowStep] = useState<FlowStep>('idle')
  const [zoomAccessToken, setZoomAccessToken] = useState<string | null>(null)
  const [idToken, setIdToken] = useState<string | null>(null)
  const [isValidated, setIsValidated] = useState(false)
  const [meetingResponse, setMeetingResponse] = useState<{ id: string; join_url: string } | null>(
    null
  )

  const nodes = [
    { id: 'calendar', x: 100, y: 320, w: 260 },
    { id: 'okta', x: 510, y: 80, w: 240 },
    { id: 'zoom', x: 920, y: 320, w: 260 },
  ]

  const edges = [
    {
      id: 'calendar-to-zoom-connect',
      from: 'calendar',
      to: 'zoom',
      label: 'Connect / Access Zoom',
      color: edgeColors.auth,
      visible: flowStep === 'calendar_to_zoom',
    },
    {
      id: 'zoom-to-okta-sso',
      from: 'zoom',
      to: 'okta',
      label: 'SSO (OIDC)',
      color: edgeColors.consent,
      pulse: flowStep === 'zoom_sso_request',
      visible: flowStep === 'zoom_sso_request',
    },
    {
      id: 'okta-to-zoom-id-token',
      from: 'okta',
      to: 'zoom',
      label: 'ID Token',
      color: edgeColors.idToken,
      visible: flowStep === 'id_token_received',
    },
    {
      id: 'calendar-to-zoom-scope-request',
      from: 'calendar',
      to: 'zoom',
      label: 'Request Scopes (meeting.read, meeting.write)',
      color: edgeColors.token,
      visible: flowStep === 'scope_request',
    },
    {
      id: 'zoom-to-calendar-access-token',
      from: 'zoom',
      to: 'calendar',
      label: 'Access Token (Zoom)',
      color: edgeColors.success,
      visible: flowStep === 'access_token_issued',
    },
    {
      id: 'calendar-to-zoom-api-request',
      from: 'calendar',
      to: 'zoom',
      label: 'POST /meetings (Bearer ...)',
      color: edgeColors.api,
      visible: flowStep === 'api_call',
    },
    {
      id: 'zoom-to-calendar-api-response',
      from: 'zoom',
      to: 'calendar',
      label: 'Meeting Created (200 OK)',
      color: edgeColors.successBright,
      visible: flowStep === 'api_response',
    },
  ]

  const handleStartFlow = () => {
    setFlowStep('calendar_to_zoom')
  }

  const handleNextStep = () => {
    switch (flowStep) {
      case 'idle':
        handleStartFlow()
        break
      case 'calendar_to_zoom':
        setFlowStep('zoom_sso_request')
        break
      case 'zoom_sso_request':
        setIsValidated(false)
        setFlowStep('idp_validates')
        break
      case 'idp_validates':
        break
      case 'id_token_received':
        setFlowStep('scope_request')
        break
      case 'scope_request':
        setFlowStep('consent_shown')
        setShowConsentDialog(true)
        break
      case 'consent_shown':
        break
      case 'access_token_issued':
        setFlowStep('api_call')
        break
      case 'api_call':
        setFlowStep('api_response')
        setMeetingResponse({
          id: '987654321',
          join_url: 'https://zoom.us/j/987654321',
        })
        break
      case 'api_response':
        break
    }
  }

  const handleAllow = () => {
    setShowConsentDialog(false)
    setFlowStep('access_token_issued')
    setZoomAccessToken(
      makeJwt({
        sub: 'google-calendar-app',
        client_id: 'zoom-client-id',
        scope: 'meeting.read meeting.write',
        iss: 'https://zoom.example.com',
      })
    )
  }

  const handleDeny = () => {
    setFlowStep('idle')
    setZoomAccessToken(null)
    setMeetingResponse(null)
  }

  const handlePreviousStep = () => {
    switch (flowStep) {
      case 'api_response':
        setMeetingResponse(null)
        setFlowStep('api_call')
        break
      case 'api_call':
        setFlowStep('access_token_issued')
        break
      case 'access_token_issued':
        setZoomAccessToken(null)
        setFlowStep('consent_shown')
        setShowConsentDialog(true)
        break
      case 'consent_shown':
        setShowConsentDialog(false)
        setFlowStep('scope_request')
        break
      case 'scope_request':
        setFlowStep('id_token_received')
        break
      case 'id_token_received':
        setIdToken(null)
        setIsValidated(true)
        setFlowStep('idp_validates')
        break
      case 'idp_validates':
        setIsValidated(false)
        setFlowStep('zoom_sso_request')
        break
      case 'zoom_sso_request':
        setFlowStep('calendar_to_zoom')
        break
      case 'calendar_to_zoom':
        setFlowStep('idle')
        break
    }
  }

  const handleReset = () => {
    setFlowStep('idle')
    setZoomAccessToken(null)
    setIdToken(null)
    setIsValidated(false)
    setMeetingResponse(null)
    setShowConsentDialog(false)
    setShowTerminal(false)
  }

  const scopes = [
    { key: 'meeting.read', description: 'Read meeting details' },
    { key: 'meeting.write', description: 'Schedule & update meetings' },
  ]

  const activeScopes = zoomAccessToken ? ['meeting.read', 'meeting.write'] : []
  const canGoNext =
    flowStep !== 'idle' &&
    flowStep !== 'idp_validates' &&
    flowStep !== 'consent_shown' &&
    flowStep !== 'api_response'

  const canGoPrevious =
    flowStep !== 'idle'

  // Auto-validate after showing validation spinner
  useEffect(() => {
    if (flowStep === 'idp_validates' && !isValidated) {
      const timer = setTimeout(() => {
        setIsValidated(true)
        const newIdToken = makeJwt({
          sub: 'user@example.com',
          email: 'user@example.com',
          iss: 'https://okta.example.com',
          aud: 'zoom-client-id',
        })
        setIdToken(newIdToken)

        setTimeout(() => {
          setFlowStep('id_token_received')
        }, 1000)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [flowStep, isValidated])

  const FLOW_STEPS: FlowStep[] = [
    'idle',
    'calendar_to_zoom',
    'zoom_sso_request',
    'idp_validates',
    'id_token_received',
    'scope_request',
    'consent_shown',
    'access_token_issued',
    'api_call',
    'api_response',
  ]
  const stepIndex = FLOW_STEPS.indexOf(flowStep)
  const reached = (step: FlowStep) => stepIndex >= FLOW_STEPS.indexOf(step)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const httpEntries: HttpRequestEntry[] = useMemo(() => {
    const entries: HttpRequestEntry[] = []

    if (reached('zoom_sso_request')) {
      entries.push({
        id: 'sso-authorize',
        stepId: 'zoom_sso_request',
        label: '/authorize',
        method: 'GET',
        url: 'https://okta.example.com/authorize',
        headers: [],
        queryParams: {
          response_type: 'code',
          client_id: 'zoom-client-id',
          redirect_uri: 'https://zoom.example.com/callback',
          scope: 'openid profile email',
        },
        response: {
          status: 302,
          statusText: 'Found',
          headers: [{ name: 'Location', value: 'https://zoom.example.com/callback?code=auth_xyz' }],
          body: null,
        },
        color: edgeColors.consent,
      })
    }

    if (reached('id_token_received')) {
      entries.push({
        id: 'okta-token',
        stepId: 'id_token_received',
        label: '/oauth/token',
        method: 'POST',
        url: 'https://okta.example.com/oauth/token',
        headers: [{ name: 'Content-Type', value: 'application/x-www-form-urlencoded' }],
        body: {
          grant_type: 'authorization_code',
          code: 'auth_xyz',
          client_id: 'zoom-client-id',
          client_secret: 'zoom-client-secret',
          redirect_uri: 'https://zoom.example.com/callback',
        },
        response: {
          status: 200,
          statusText: 'OK',
          headers: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Cache-Control', value: 'no-store' },
          ],
          body: {
            id_token: 'eyJ...',
            token_type: 'Bearer',
          },
        },
        color: edgeColors.idToken,
      })
    }

    if (reached('scope_request')) {
      entries.push({
        id: 'scope-request',
        stepId: 'scope_request',
        label: '/oauth/authorize',
        method: 'GET',
        url: 'https://zoom.example.com/oauth/authorize',
        headers: [{ name: 'Host', value: 'zoom.example.com' }],
        queryParams: {
          response_type: 'code',
          client_id: 'google-calendar-app',
          redirect_uri: 'https://calendar.example.com/callback',
          scope: 'meeting.read meeting.write',
          state: 'cal_state_xyz',
        },
        response: {
          status: 302,
          statusText: 'Found',
          headers: [
            { name: 'Location', value: 'https://zoom.example.com/consent?...' },
          ],
          body: null,
        },
        color: edgeColors.token,
      })
    }

    if (reached('access_token_issued')) {
      entries.push({
        id: 'zoom-access-token',
        stepId: 'access_token_issued',
        label: '/oauth/token',
        method: 'POST',
        url: 'https://zoom.example.com/oauth/token',
        headers: [{ name: 'Content-Type', value: 'application/x-www-form-urlencoded' }],
        body: {
          grant_type: 'authorization_code',
          code: 'consent_code_xyz',
          client_id: 'google-calendar-app',
          client_secret: 'calendar-app-secret',
          redirect_uri: 'https://calendar.example.com/callback',
        },
        response: {
          status: 200,
          statusText: 'OK',
          headers: [{ name: 'Content-Type', value: 'application/json' }],
          body: {
            access_token: zoomAccessToken || 'eyJ...',
            token_type: 'Bearer',
            scope: 'meeting.read meeting.write',
          },
        },
        color: edgeColors.success,
      })
    }

    if (reached('api_call')) {
      entries.push({
        id: 'create-meeting',
        stepId: 'api_call',
        label: '/v2/users/me/meetings',
        method: 'POST',
        url: 'https://api.zoom.example.com/v2/users/me/meetings',
        headers: [
          {
            name: 'Authorization',
            value: `Bearer ${zoomAccessToken?.substring(0, 20)}...`,
          },
          { name: 'Content-Type', value: 'application/json' },
        ],
        body: {
          topic: 'Team Sync',
          type: '2',
          duration: '30',
        },
        response: reached('api_response')
          ? {
              status: 200,
              statusText: 'OK',
              headers: [{ name: 'Content-Type', value: 'application/json' }],
              body: { id: '987654321', join_url: 'https://zoom.us/j/987654321' },
            }
          : {
              status: 0,
              statusText: 'Pending...',
              headers: [],
              body: null,
            },
        color: edgeColors.api,
      })
    }

    return entries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowStep])

  return (
    <SlideLayout
      title="App-to-App Integration: Calendar ↔ Zoom"
      flowStep={flowStep}
      stepMetadata={stepMetadata}
      onStart={handleStartFlow}
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
          {/* IDP Validation Indicator - positioned to the right of Okta node */}
          {flowStep === 'idp_validates' && (
            <ValidationIndicatorPositioned isValidated={isValidated} nodeId="okta" position="right" />
          )}

          {/* API Request - Top left, moved up to avoid overlap */}
          {(flowStep === 'api_call' || flowStep === 'api_response') && (
            <div className="absolute left-8 top-[120px] w-[380px] bg-neutral-900/95 border border-neutral-800 rounded-lg p-4 z-50 shadow-xl">
              <div className="font-mono text-sm">
                <div className="font-semibold mb-2 text-neutral-200">Request:</div>
                <pre className="bg-neutral-950 p-3 rounded border border-neutral-800 text-xs text-neutral-300 overflow-auto">
{`POST /meetings
Authorization: Bearer ${zoomAccessToken?.substring(0, 20)}...

{
  "topic": "Team Sync",
  "type": 2,
  "start_time": "2025-11-02T10:00:00Z",
  "duration": 30
}`}
                </pre>
              </div>
            </div>
          )}

          {/* Token Display - Bottom Right */}
          {(idToken || zoomAccessToken) && (
            <div className="absolute right-8 bottom-8 w-[320px] bg-neutral-900/95 border border-neutral-800 rounded-lg p-4 z-50 shadow-xl">
              <h4 className="text-sm font-semibold mb-3 text-neutral-200">Tokens</h4>
              <div className="flex flex-col gap-4">
                {idToken && (
                  <TokenChip
                    label="ID Token (IDP)"
                    value={idToken}
                    scopes={['profile', 'email']}
                  />
                )}
                {zoomAccessToken && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <h5 className="text-xs font-semibold text-neutral-300 w-full mb-1">Active Scopes:</h5>
                      {activeScopes.map((scope) => (
                        <Badge key={scope} variant="secondary" className="text-xs bg-neutral-800 border-neutral-700 text-neutral-200">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                    <TokenChip
                      label="Access Token (Zoom)"
                      value={zoomAccessToken}
                      scopes={['meeting.read', 'meeting.write']}
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* API Response - Below request, top left area */}
          {meetingResponse && (
            <div className="absolute left-8 top-[330px] w-[380px] bg-neutral-900/95 border border-neutral-800 rounded-lg p-4 z-50 shadow-xl">
              <div className="font-mono text-sm">
                <div className="font-semibold mb-2 text-neutral-200">Response:</div>
                <pre className="bg-neutral-950 p-3 rounded border border-neutral-800 text-xs text-neutral-300 overflow-auto">
                  {JSON.stringify(meetingResponse, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </Stage>
      </div>

      {/* Terminal toggle button */}
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

      {/* Consent Dialog */}
      <ConsentDialog
        open={showConsentDialog}
        onOpenChange={setShowConsentDialog}
        appName="Zoom"
        scopes={scopes}
        onAllow={handleAllow}
        onDeny={handleDeny}
        variant="app-to-app"
      />
    </SlideLayout>
  )
}
