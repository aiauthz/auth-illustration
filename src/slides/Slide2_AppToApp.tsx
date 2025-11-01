import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Stage } from '@/stage/Stage'
import { TokenChip } from '@/components/TokenChip'
import { ConsentDialog } from '@/components/ConsentDialog'
import { makeJwt } from '@/lib/tokens'
import { Play, RotateCcw, ArrowRight } from 'lucide-react'

type FlowStep =
  | 'idle'
  | 'initiate'
  | 'zoom_auth_request'
  | 'consent_allowed'
  | 'code_received'
  | 'token_exchange'
  | 'tokens_received'
  | 'api_call'
  | 'api_response'

// Step metadata for captions and sequence numbers
const stepMetadata: Record<FlowStep, { number: number; caption: string } | null> = {
  idle: null,
  initiate: {
    number: 1,
    caption: 'User wants to connect Zoom to Calendar - Calendar app initiates OAuth flow to get permission to access Zoom API on behalf of the user',
  },
  zoom_auth_request: {
    number: 2,
    caption: 'Authorization request - Calendar app redirects to Okta requesting permission to access Zoom API with meeting.read and meeting.write scopes',
  },
  consent_allowed: {
    number: 3,
    caption: 'User grants consent - Okta confirms that Calendar app can access Zoom API on user\'s behalf with the requested permissions',
  },
  code_received: {
    number: 4,
    caption: 'Authorization code received - Okta redirects back to Zoom with a one-time authorization code that can be exchanged for tokens',
  },
  token_exchange: {
    number: 5,
    caption: 'Token exchange - Zoom exchanges the authorization code for an access token by sending it to Okta with client credentials',
  },
  tokens_received: {
    number: 6,
    caption: 'Access token received - Zoom now has an access token that Calendar can use to make API calls to Zoom on behalf of the user',
  },
  api_call: {
    number: 7,
    caption: 'API call with token - Calendar app calls Zoom API to create a meeting, including the access token in the Authorization header',
  },
  api_response: {
    number: 8,
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
      id: 'calendar-to-zoom-init',
      from: 'calendar',
      to: 'zoom',
      label: 'Initiate Install / Connect',
      color: '#60a5fa', // Blue
      visible: flowStep === 'initiate',
    },
    {
      id: 'zoom-to-okta-auth',
      from: 'zoom',
      to: 'okta',
      label: 'Auth Request (meeting.read, meeting.write)',
      color: '#f59e0b', // Orange
      pulse: flowStep === 'zoom_auth_request',
      visible: flowStep === 'zoom_auth_request',
    },
    {
      id: 'okta-to-zoom-code',
      from: 'okta',
      to: 'zoom',
      label: 'Authorization Code',
      color: '#10b981', // Green
      visible: flowStep === 'code_received',
    },
    {
      id: 'zoom-to-okta-token',
      from: 'zoom',
      to: 'okta',
      label: 'Token Exchange',
      color: '#8b5cf6', // Purple
      visible: flowStep === 'token_exchange',
    },
    {
      id: 'okta-to-zoom-tokens',
      from: 'okta',
      to: 'zoom',
      label: 'Access Token (Zoom)',
      color: '#ec4899', // Pink
      visible: flowStep === 'tokens_received',
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
    setFlowStep('initiate')
  }

  const handleNextStep = () => {
    switch (flowStep) {
      case 'idle':
        handleStartFlow()
        break
      case 'initiate':
        setFlowStep('zoom_auth_request')
        setShowConsentDialog(true)
        break
      case 'zoom_auth_request':
        // Wait for user to allow consent
        break
      case 'consent_allowed':
        setFlowStep('code_received')
        break
      case 'code_received':
        setFlowStep('token_exchange')
        break
      case 'token_exchange':
        setFlowStep('tokens_received')
        setZoomAccessToken(
          makeJwt({
            sub: 'google-calendar-app',
            client_id: 'zoom-client-id',
            scope: 'meeting.read meeting.write',
            iss: 'https://okta.example.com',
          })
        )
        break
      case 'tokens_received':
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
    setFlowStep('consent_allowed')
  }

  const handleDeny = () => {
    setFlowStep('idle')
    setZoomAccessToken(null)
    setMeetingResponse(null)
  }

  const handleReset = () => {
    setFlowStep('idle')
    setZoomAccessToken(null)
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
    flowStep !== 'zoom_auth_request' && 
    flowStep !== 'api_response'

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

          {/* Scope Viewer - Bottom Right */}
          {zoomAccessToken && (
            <div className="absolute right-8 bottom-8 w-[320px] bg-neutral-900/95 border border-neutral-800 rounded-lg p-4 z-50 shadow-xl">
              <h4 className="text-sm font-semibold mb-3 text-neutral-200">Active Scopes</h4>
              <div className="flex flex-wrap gap-2">
                {activeScopes.map((scope) => (
                  <Badge key={scope} variant="secondary" className="text-xs bg-neutral-800 border-neutral-700 text-neutral-200">
                    {scope}
                  </Badge>
                ))}
              </div>
              <div className="mt-4">
                <TokenChip
                  label="zoom_access_token"
                  value={zoomAccessToken}
                  scopes={['meeting.read', 'meeting.write']}
                />
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