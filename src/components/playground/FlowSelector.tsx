import { cn } from '@/lib/utils'
import type { OAuthFlowType } from '@/lib/providers'

interface FlowSelectorProps {
  supportedFlows: OAuthFlowType[]
  selectedFlow: OAuthFlowType
  onSelect: (flow: OAuthFlowType) => void
}

const flowLabels: Record<OAuthFlowType, { name: string; description: string }> = {
  authorization_code_pkce: {
    name: 'Auth Code + PKCE',
    description: 'Recommended for public clients (SPAs, mobile)',
  },
  authorization_code: {
    name: 'Auth Code (Confidential)',
    description: 'For server-side apps with client_secret',
  },
  client_credentials: {
    name: 'Client Credentials',
    description: 'Machine-to-machine, no user involved',
  },
  implicit: {
    name: 'Implicit (Deprecated)',
    description: 'Legacy flow — shown for educational purposes',
  },
}

export function FlowSelector({ supportedFlows, selectedFlow, onSelect }: FlowSelectorProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-400 mb-1.5">OAuth Flow</label>
      <div className="space-y-1.5">
        {supportedFlows.map((flow) => {
          const info = flowLabels[flow]
          return (
            <button
              key={flow}
              onClick={() => onSelect(flow)}
              className={cn(
                'w-full px-3 py-2 rounded-md text-left transition-colors',
                selectedFlow === flow
                  ? 'bg-emerald-600/20 border border-emerald-500/40'
                  : 'bg-neutral-800 border border-neutral-700 hover:border-neutral-600',
              )}
            >
              <div
                className={cn(
                  'text-sm font-medium',
                  selectedFlow === flow ? 'text-emerald-400' : 'text-neutral-300',
                )}
              >
                {info.name}
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">{info.description}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
