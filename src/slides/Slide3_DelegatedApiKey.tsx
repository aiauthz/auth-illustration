import { useState } from 'react'
import { Stage } from '@/stage/Stage'
import { SlideLayout } from '@/components/SlideLayout'
import { edgeColors } from '@/lib/colors'
import { Copy, Check } from 'lucide-react'

type FlowStep =
  | 'idle'
  | 'user_has_api_key'
  | 'user_shares_key'
  | 'agent_receives_key'
  | 'agent_makes_call'
  | 'api_response'

// Step metadata for captions and sequence numbers
const stepMetadata: Record<FlowStep, { number: number; caption: string } | null> = {
  idle: null,
  user_has_api_key: {
    number: 1,
    caption: 'User has Zoom API key - The user possesses a personal API key from Zoom that grants full access to their meetings and recordings',
  },
  user_shares_key: {
    number: 2,
    caption: 'User delegates API key to AI Agent - The user copies and pastes their Zoom API key into the AI Agent so it can access meeting recordings',
  },
  agent_receives_key: {
    number: 3,
    caption: 'AI Agent stores the key - The AI Agent receives and stores the Zoom API key, now having complete access to all user meetings and recordings',
  },
  agent_makes_call: {
    number: 4,
    caption: 'AI Agent accesses recordings - The agent uses the delegated API key to fetch meeting recordings from Zoom to generate meeting minutes',
  },
  api_response: {
    number: 5,
    caption: 'Zoom responds with recordings - Zoom API responds successfully because the key is valid, but cannot distinguish between user and agent actions',
  },
}

/**
 * Slide 3: Delegated API Key (The Problem)
 * Shows how users delegate Zoom API keys to AI Agents for meeting minutes generation
 * Highlights the security concerns with this approach
 */
export function Slide3_DelegatedApiKey() {
  const [flowStep, setFlowStep] = useState<FlowStep>('idle')
  const [apiKey] = useState('zjwt_abc123def456...')
  const [keyCopied, setKeyCopied] = useState(false)

  const nodes = [
    { id: 'user', x: 100, y: 280, w: 220 },
    { id: 'agent', x: 510, y: 280, w: 240 },
    { id: 'zoom', x: 920, y: 280, w: 260 },
  ]

  const edges = [
    {
      id: 'user-to-agent-key',
      from: 'user',
      to: 'agent',
      label: 'Copy/Paste Zoom API Key',
      color: edgeColors.consent,
      visible: flowStep === 'user_shares_key',
    },
    {
      id: 'agent-stores-key',
      from: 'user',
      to: 'agent',
      label: 'Key Stored in Agent',
      color: edgeColors.error,
      visible: flowStep === 'agent_receives_key',
    },
    {
      id: 'agent-to-zoom-call',
      from: 'agent',
      to: 'zoom',
      label: 'GET /recordings (Bearer zjwt_...)',
      color: edgeColors.token,
      visible: flowStep === 'agent_makes_call',
    },
    {
      id: 'zoom-to-agent-response',
      from: 'zoom',
      to: 'agent',
      label: 'Meeting Recordings (200 OK)',
      color: edgeColors.success,
      visible: flowStep === 'api_response',
    },
  ]

  const handleStartFlow = () => {
    setFlowStep('user_has_api_key')
  }

  const handleNextStep = () => {
    switch (flowStep) {
      case 'idle':
        handleStartFlow()
        break
      case 'user_has_api_key':
        setFlowStep('user_shares_key')
        setKeyCopied(true)
        setTimeout(() => setKeyCopied(false), 2000)
        break
      case 'user_shares_key':
        setFlowStep('agent_receives_key')
        break
      case 'agent_receives_key':
        setFlowStep('agent_makes_call')
        break
      case 'agent_makes_call':
        setFlowStep('api_response')
        break
      case 'api_response':
        break
    }
  }

  const handlePreviousStep = () => {
    switch (flowStep) {
      case 'api_response':
        setFlowStep('agent_makes_call')
        break
      case 'agent_makes_call':
        setFlowStep('agent_receives_key')
        break
      case 'agent_receives_key':
        setKeyCopied(false)
        setFlowStep('user_shares_key')
        break
      case 'user_shares_key':
        setFlowStep('user_has_api_key')
        break
      case 'user_has_api_key':
        setFlowStep('idle')
        break
    }
  }

  const handleReset = () => {
    setFlowStep('idle')
    setKeyCopied(false)
  }

  const canGoNext = flowStep !== 'idle' && flowStep !== 'api_response'

  const canGoPrevious = flowStep !== 'idle'

  return (
    <SlideLayout
      title="Approach: Delegated API Key to AI Agent"
      flowStep={flowStep}
      stepMetadata={stepMetadata}
      onStart={handleStartFlow}
      onNext={handleNextStep}
      onPrevious={handlePreviousStep}
      onReset={handleReset}
      canGoNext={canGoNext}
      canGoPrevious={canGoPrevious}
    >
      {/* Full-screen Stage */}
      <div className="w-full h-full">
        <Stage nodes={nodes} edges={edges} className="w-full h-full">
          {/* API Key Display - Shows when user has key */}
          {(flowStep === 'user_has_api_key' || flowStep === 'user_shares_key') && (
            <div className="absolute left-8 top-[140px] w-[380px] bg-neutral-900/95 border border-orange-800/50 rounded-lg p-4 z-50 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-neutral-200">User's Zoom API Key</h4>
                {keyCopied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-neutral-400" />
                )}
              </div>
              <div className="font-mono text-xs bg-neutral-950 p-3 rounded border border-neutral-800 text-neutral-300 break-all">
                {apiKey}
              </div>
              <div className="mt-2 text-xs text-orange-400">
                ⚠️ Full access to all meetings & recordings
              </div>
            </div>
          )}

          {/* Agent Stored Key - Shows when agent receives key */}
          {(flowStep === 'agent_receives_key' || flowStep === 'agent_makes_call' || flowStep === 'api_response') && (
            <div className="absolute left-[50%] transform -translate-x-1/2 top-[140px] w-[380px] bg-neutral-900/95 border border-red-800/50 rounded-lg p-4 z-50 shadow-xl">
              <h4 className="text-sm font-semibold text-neutral-200 mb-2">AI Agent: Minutes Generator</h4>
              <div className="space-y-2">
                <div className="text-xs text-neutral-400">Purpose: Generate meeting minutes</div>
                <div className="text-xs text-neutral-400">Zoom API Key:</div>
                <div className="font-mono text-xs bg-neutral-950 p-3 rounded border border-neutral-800 text-neutral-300 break-all">
                  {apiKey}
                </div>
                <div className="mt-2 text-xs text-red-400">
                  🚨 No expiration • Access to ALL recordings • No audit trail
                </div>
              </div>
            </div>
          )}

          {/* API Request - Shows during agent call */}
          {flowStep === 'agent_makes_call' && (
            <div className="absolute right-8 top-[380px] w-[380px] bg-neutral-900/95 border border-neutral-800 rounded-lg p-4 z-50 shadow-xl">
              <div className="font-mono text-sm">
                <div className="font-semibold mb-2 text-neutral-200">Request:</div>
                <pre className="bg-neutral-950 p-3 rounded border border-neutral-800 text-xs text-neutral-300 overflow-auto">
{`GET /users/me/recordings
Authorization: Bearer ${apiKey}

Agent fetching recordings
to generate meeting minutes
No way to distinguish from user!`}
                </pre>
              </div>
            </div>
          )}

          {/* API Response */}
          {flowStep === 'api_response' && (
            <div className="absolute right-8 bottom-[120px] w-[380px] bg-neutral-900/95 border border-neutral-800 rounded-lg p-4 z-50 shadow-xl">
              <div className="font-mono text-sm">
                <div className="font-semibold mb-2 text-neutral-200">Response:</div>
                <pre className="bg-neutral-950 p-3 rounded border border-neutral-800 text-xs text-neutral-300 overflow-auto">
{`HTTP/1.1 200 OK
Content-Type: application/json

{
  "recordings": [
    {
      "id": "abc123",
      "topic": "Team Standup",
      "start_time": "2025-11-02T10:00",
      "recording_files": [...]
    }
  ]
}`}
                </pre>
              </div>
            </div>
          )}

          {/* Security Warning - Shows at final step */}
          {flowStep === 'api_response' && (
            <div className="absolute left-8 bottom-[120px] w-[420px] bg-red-950/90 border border-red-800 rounded-lg p-5 z-50 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🚨</div>
                <div>
                  <h4 className="font-bold text-red-200 mb-2">Security Concerns</h4>
                  <ul className="text-sm text-red-300 space-y-1.5">
                    <li>• API key has unlimited lifetime</li>
                    <li>• Agent has access to ALL recordings, not just needed ones</li>
                    <li>• No way to revoke agent access separately</li>
                    <li>• Can't distinguish user vs agent actions in logs</li>
                    <li>• If agent is compromised, entire account is at risk</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </Stage>
      </div>
    </SlideLayout>
  )
}
