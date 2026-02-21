import { useState, useMemo } from 'react'
import { Stage } from '@/stage/Stage'
import { SlideLayout } from '@/components/SlideLayout'
import { HttpRequestPanel, type HttpRequestEntry } from '@/components/HttpRequestPanel'
import { edgeColors } from '@/lib/colors'
import { InsightsPanel, type InsightEntry } from '@/components/InsightsPanel'
import { Terminal, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const [showTerminal, setShowTerminal] = useState(false)

  const FLOW_STEPS: FlowStep[] = [
    'idle',
    'user_has_api_key',
    'user_shares_key',
    'agent_receives_key',
    'agent_makes_call',
    'api_response',
  ]
  const stepIndex = FLOW_STEPS.indexOf(flowStep)
  const reached = (step: FlowStep) => stepIndex >= FLOW_STEPS.indexOf(step)

  const httpEntries: HttpRequestEntry[] = useMemo(() => {
    const entries: HttpRequestEntry[] = []

    if (reached('agent_makes_call')) {
      entries.push({
        id: 'get-recordings',
        stepId: 'agent_makes_call',
        label: '/users/me/recordings',
        method: 'GET',
        url: 'https://api.zoom.example.com/v2/users/me/recordings',
        headers: [
          { name: 'Authorization', value: 'Bearer zjwt_abc123def456...' },
          { name: 'Host', value: 'api.zoom.example.com' },
        ],
        response: reached('api_response')
          ? {
              status: 200,
              statusText: 'OK',
              headers: [{ name: 'Content-Type', value: 'application/json' }],
              body: {
                recordings: [
                  {
                    id: 'abc123',
                    topic: 'Team Standup',
                    start_time: '2025-11-02T10:00:00Z',
                    recording_files: ['recording1.mp4'],
                  },
                ],
              },
            }
          : { status: 0, statusText: 'Pending...', headers: [], body: null },
        color: edgeColors.token,
      })
    }

    return entries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowStep])

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
  }

  const canGoNext = flowStep !== 'idle' && flowStep !== 'api_response'

  const canGoPrevious = flowStep !== 'idle'

  const insightEntries: InsightEntry[] = [
    {
      id: 'security-concerns',
      stepId: 'api_response',
      title: 'Security Concerns with Delegated API Keys',
      variant: 'negative',
      sections: [
        {
          heading: 'Key Risks',
          variant: 'negative',
          items: [
            '• API key has unlimited lifetime',
            '• Agent has access to ALL recordings',
            '• No way to revoke agent access separately',
          ],
        },
        {
          heading: 'Visibility Gaps',
          variant: 'negative',
          items: [
            "• Can't distinguish user vs agent in logs",
            '• If agent compromised, full account at risk',
            '• No IdP visibility or control',
          ],
        },
      ],
    },
  ]

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
        <Stage nodes={nodes} edges={edges} className="w-full h-full" />

      </div>

      <InsightsPanel entries={insightEntries} activeStepId={flowStep} />

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
    </SlideLayout>
  )
}
