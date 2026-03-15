import { cn } from '@/lib/utils'
import { Check, Circle, Loader2 } from 'lucide-react'

export interface TimelineStep {
  id: string
  label: string
  status: 'pending' | 'in_progress' | 'complete' | 'error'
  durationMs?: number
}

interface FlowTimelineProps {
  steps: TimelineStep[]
  onStepClick?: (stepId: string) => void
  className?: string
}

/**
 * Vertical timeline that builds in real-time as the flow progresses.
 * Each step shows its status and optional duration.
 */
export function FlowTimeline({ steps, onStepClick, className }: FlowTimelineProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        return (
          <div
            key={step.id}
            className={cn(
              'flex gap-3 cursor-pointer group',
              step.status === 'pending' && 'opacity-40',
            )}
            onClick={() => onStepClick?.(step.id)}
          >
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center flex-shrink-0">
              <StepIcon status={step.status} />
              {!isLast && (
                <div
                  className={cn(
                    'w-px flex-1 min-h-[16px]',
                    step.status === 'complete' ? 'bg-emerald-600/50' : 'bg-neutral-700',
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className="pb-3 -mt-0.5 min-w-0">
              <div
                className={cn(
                  'text-xs font-medium leading-snug',
                  step.status === 'complete' && 'text-neutral-300',
                  step.status === 'in_progress' && 'text-emerald-400',
                  step.status === 'pending' && 'text-neutral-500',
                  step.status === 'error' && 'text-red-400',
                )}
              >
                {step.label}
              </div>
              {step.durationMs !== undefined && step.status === 'complete' && (
                <div className="text-[10px] text-neutral-600 mt-0.5">
                  {step.durationMs < 1000
                    ? `${step.durationMs}ms`
                    : `${(step.durationMs / 1000).toFixed(1)}s`}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StepIcon({ status }: { status: TimelineStep['status'] }) {
  switch (status) {
    case 'complete':
      return (
        <div className="w-5 h-5 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center">
          <Check className="h-3 w-3 text-emerald-400" />
        </div>
      )
    case 'in_progress':
      return (
        <div className="w-5 h-5 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center">
          <Loader2 className="h-3 w-3 text-emerald-400 animate-spin" />
        </div>
      )
    case 'error':
      return (
        <div className="w-5 h-5 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center">
          <span className="text-red-400 text-[10px] font-bold">!</span>
        </div>
      )
    case 'pending':
    default:
      return (
        <div className="w-5 h-5 flex items-center justify-center">
          <Circle className="h-2.5 w-2.5 text-neutral-600" />
        </div>
      )
  }
}
