import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Stage } from '@/stage/Stage'
import { TokenChip } from '@/components/TokenChip'
import { ConsentDialog } from '@/components/ConsentDialog'
import { ValidationIndicatorPositioned } from '@/components/ValidationIndicatorPositioned'
import { makeJwt } from '@/lib/tokens'
import { Play, RotateCcw, ArrowRight, ArrowLeft } from 'lucide-react'

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
 * Slide 2: App-to-App via OAuth: Google Calendar ↔ Zoom
 * Full-screen Stage-based layout
 */
export function Slide2_AppToApp() {
  const [showConsentDialog, setShowConsentDialog] = useState(false)
  const [flowStep, setFlowStep] = useState<FlowStep>('idle')
  const [zoomAccessToken, setZoomAccessToken] = useState<string | null>(null)
  const [idToken, setIdToken] = useState<string | null>(null) // ID token from IDP (for identity verification only)
  const [isValidated, setIsValidated] = useState(false)
  const [meetingResponse, setMeetingResponse] = useState<{ id: string; join_url: string } | null>(
    null
  )

  const nodes = [
    { id: 'calendar', x: 100, y: 320, w: 260 },  // Left side, lower - center: 230, 380, right edge: 360
    { id: 'okta', x: 510, y: 80, w: 240 },       // Center top - center: 630, 140, bottom edge: 200
    { id: 'zoom', x: 920, y: 320, w: 260 },      // Right side, lower - center: 1050, 380, left edge: 920
  ]

  // Token path calculations:
  // Calendar <-> Zoom: horizontal at y=380 (x: 360 <-> 920)
  // Zoom <-> Okta: diagonal path (from 1050,380 to 630,200) or (from 920,320 to 630,200)
  // The EdgeLayer uses Manhattan routing, so paths are right-angled

  const edges = [
    {
      id: 'calendar-to-zoom-connect',
      from: 'calendar',
      to: 'zoom',
      label: 'Connect / Access Zoom',
      color: '#60a5fa', // Blue
      visible: flowStep === 'calendar_to_zoom',
    },
    {
      id: 'zoom-to-okta-sso',
      from: 'zoom',
      to: 'okta',
      label: 'SSO (OIDC)',
      color: '#f59e0b', // Orange
      pulse: flowStep === 'zoom_sso_request',
      visible: flowStep === 'zoom_sso_request',
    },
    {
      id: 'okta-to-zoom-id-token',
      from: 'okta',
      to: 'zoom',
      label: 'ID Token',
      color: '#ec4899', // Pink
      visible: flowStep === 'id_token_received',
    },
    {
      id: 'calendar-to-zoom-scope-request',
      from: 'calendar',
      to: 'zoom',
      label: 'Request Scopes (meeting.read, meeting.write)',
      color: '#8b5cf6', // Purple
      visible: flowStep === 'scope_request',
    },
    {
      id: 'zoom-to-calendar-access-token',
      from: 'zoom',
      to: 'calendar',
      label: 'Access Token (Zoom)',
      color: '#10b981', // Green
      visible: flowStep === 'access_token_issued',
    },
    {
      id: 'calendar-to-zoom-api-request',
      from: 'calendar',
      to: 'zoom',
      label: 'POST /meetings (Bearer ...)',
      color: '#06b6d4', // Cyan
      visible: flowStep === 'api_call',
    },
    {
      id: 'zoom-to-calendar-api-response',
      from: 'zoom',
      to: 'calendar',
      label: 'Meeting Created (200 OK)',
      color: '#22c55e', // Lime Green
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
        // SSO happens, wait for validation
        setIsValidated(false)
        setFlowStep('idp_validates')
        break
      case 'idp_validates':
        // Wait for validation to complete
        break
      case 'id_token_received':
        // IDP returned ID token, now request scopes
        setFlowStep('scope_request')
        break
      case 'scope_request':
        // Show consent dialog for scopes
        setFlowStep('consent_shown')
        setShowConsentDialog(true)
        break
      case 'consent_shown':
        // Wait for user to grant consent
        break
      case 'access_token_issued':
        // Zoom issued access token
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
        // Already at final step
        break
    }
  }

  const handleAllow = () => {
    setShowConsentDialog(false)
    setFlowStep('access_token_issued')
    // Zoom issues its own access token
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
        setIsValidated(true) // Show validated state
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
        // After validation completes, generate ID token and move to next step
        const newIdToken = makeJwt({
          sub: 'user@example.com',
          email: 'user@example.com',
          iss: 'https://okta.example.com',
          aud: 'zoom-client-id',
        })
        setIdToken(newIdToken)
        
        // Auto-advance to id_token_received after validation
        setTimeout(() => {
          setFlowStep('id_token_received')
        }, 1000) // Show validated state for 1 second before moving on
      }, 1500) // Show validation spinner for 1.5 seconds
      
      return () => clearTimeout(timer)
    }
  }, [flowStep, isValidated])

  // Listen for global next step event (from presentation clicker)
  useEffect(() => {
    const handleGlobalNextStep = () => {
      if (flowStep === 'idle') {
        handleStartFlow()
      } else if (canGoNext) {
        handleNextStep()
      }
    }

    window.addEventListener('slideNextStep', handleGlobalNextStep)
    return () => {
      window.removeEventListener('slideNextStep', handleGlobalNextStep)
    }
  }, [flowStep, canGoNext])

  return (
    <div className="flex flex-col w-full h-full relative">
      {/* Control Buttons - Top left */}
      <div className="absolute top-4 left-4 z-50 flex gap-4">
        {flowStep === 'idle' ? (
          <Button onClick={handleStartFlow} size="lg" className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700 shadow-lg">
            <Play className="h-5 w-5 mr-2" />
            Start OAuth Flow
          </Button>
        ) : (
          <>
            <Button
              onClick={handlePreviousStep}
              disabled={!canGoPrevious}
              size="lg"
              className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700 disabled:opacity-50 shadow-lg"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Previous
            </Button>
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

      {/* Slide Title - Top center */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
        <h2 className="text-2xl font-bold text-neutral-100 bg-neutral-800/90 px-6 py-3 rounded-lg shadow-lg border border-neutral-700">
          App-to-App Integration: Calendar ↔ Zoom
        </h2>
      </div>

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
    </div>
  )
}