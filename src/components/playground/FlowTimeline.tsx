import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { Check, Circle, Loader2, ChevronDown, ArrowRight, ArrowLeft } from 'lucide-react'
import type { HttpRequestEntry } from '@/components/HttpRequestPanel'

export interface TimelineStep {
  id: string
  label: string
  status: 'pending' | 'in_progress' | 'complete' | 'error'
  durationMs?: number
  /** HTTP request/response associated with this step */
  httpEntry?: HttpRequestEntry
  /** Redirect URL for redirect steps */
  redirectUrl?: string
  /** Error message */
  error?: string
}

interface FlowTimelineProps {
  steps: TimelineStep[]
  onStepClick?: (stepId: string) => void
  className?: string
}

/**
 * Vertical timeline with expandable request/response detail per step.
 * Click any completed step to see the HTTP exchange that happened.
 */
export function FlowTimeline({ steps, onStepClick, className }: FlowTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
    onStepClick?.(id)
  }

  return (
    <div className={cn('space-y-0', className)}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        const isExpanded = expandedId === step.id
        const hasDetail = !!step.httpEntry || !!step.redirectUrl || !!step.error
        const isClickable = step.status !== 'pending'

        return (
          <div key={`${step.id}-${i}`}>
            {/* Step row */}
            <div
              className={cn(
                'flex gap-3 group',
                step.status === 'pending' && 'opacity-40',
                isClickable && 'cursor-pointer',
              )}
              onClick={() => isClickable && toggle(step.id)}
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
              <div className="pb-3 -mt-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-xs font-medium leading-snug flex-1',
                      step.status === 'complete' && 'text-neutral-300',
                      step.status === 'in_progress' && 'text-emerald-400',
                      step.status === 'pending' && 'text-neutral-500',
                      step.status === 'error' && 'text-red-400',
                    )}
                  >
                    {step.label}
                  </span>
                  {hasDetail && isClickable && (
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-3 w-3 text-neutral-600 group-hover:text-neutral-400" />
                    </motion.div>
                  )}
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

            {/* Expandable detail */}
            <AnimatePresence>
              {isExpanded && hasDetail && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden ml-8 mb-3"
                >
                  {step.httpEntry && <HttpDetail entry={step.httpEntry} />}
                  {step.redirectUrl && (
                    <div className="rounded-lg border border-amber-800/30 bg-amber-950/20 p-3">
                      <div className="text-[10px] text-amber-500 uppercase tracking-wider font-semibold mb-1.5">
                        Redirect
                      </div>
                      <code className="text-xs text-amber-300 break-all leading-relaxed">
                        {step.redirectUrl}
                      </code>
                    </div>
                  )}
                  {step.error && (
                    <div className="rounded-lg border border-red-800/30 bg-red-950/20 p-3">
                      <div className="text-[10px] text-red-500 uppercase tracking-wider font-semibold mb-1.5">
                        Error
                      </div>
                      <p className="text-xs text-red-300">{step.error}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

/** Expandable HTTP request/response detail card */
function HttpDetail({ entry }: { entry: HttpRequestEntry }) {
  const [showResponse, setShowResponse] = useState(false)
  const hasResponse = entry.response && entry.response.status > 0

  return (
    <div className="rounded-lg border border-neutral-700/50 bg-neutral-900/80 overflow-hidden">
      {/* Request */}
      <div className="p-3 border-b border-neutral-800/50">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-bold font-mono',
              entry.method === 'GET'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-emerald-500/20 text-emerald-400',
            )}
          >
            {entry.method}
          </span>
          <code className="text-xs text-neutral-300 truncate">{entry.url}</code>
        </div>

        {/* Query params */}
        {entry.queryParams && Object.keys(entry.queryParams).length > 0 && (
          <div className="mt-2">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
              Parameters
            </div>
            <div className="bg-neutral-950/50 rounded p-2 space-y-0.5">
              {Object.entries(entry.queryParams).map(([key, value]) => (
                <div key={key} className="flex text-[11px] font-mono">
                  <span className="text-cyan-400 flex-shrink-0">{key}</span>
                  <span className="text-neutral-600 mx-1">=</span>
                  <span className="text-green-400 break-all">{truncate(value, 60)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        {entry.body && Object.keys(entry.body).length > 0 && (
          <div className="mt-2">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Body</div>
            <div className="bg-neutral-950/50 rounded p-2 space-y-0.5">
              {Object.entries(entry.body).map(([key, value]) => (
                <div key={key} className="flex text-[11px] font-mono">
                  <span className="text-cyan-400 flex-shrink-0">{key}</span>
                  <span className="text-neutral-600 mx-1">:</span>
                  <span className="text-green-400 break-all">{truncate(String(value), 50)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Response toggle */}
      {hasResponse && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowResponse((v) => !v)
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-wider font-semibold hover:bg-neutral-800/50 transition-colors"
          >
            {showResponse ? (
              <ArrowLeft className="h-3 w-3 text-neutral-500" />
            ) : (
              <ArrowRight className="h-3 w-3 text-neutral-500" />
            )}
            <span className="text-neutral-500">Response</span>
            <StatusBadge status={entry.response.status} statusText={entry.response.statusText} />
          </button>

          <AnimatePresence>
            {showResponse && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-neutral-800/50"
              >
                <div className="p-3">
                  {/* Response headers */}
                  {entry.response.headers.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                        Headers
                      </div>
                      <div className="bg-neutral-950/50 rounded p-2 space-y-0.5">
                        {entry.response.headers.map((h) => (
                          <div key={h.name} className="flex text-[11px] font-mono">
                            <span className="text-cyan-400 flex-shrink-0">{h.name}</span>
                            <span className="text-neutral-600 mx-1">:</span>
                            <span className="text-neutral-300 break-all">{h.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Response body */}
                  {entry.response.body != null && (
                    <div>
                      <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                        Body
                      </div>
                      <pre className="bg-neutral-950/50 rounded p-2 text-[11px] font-mono text-green-400 whitespace-pre-wrap break-all leading-relaxed">
                        {typeof entry.response.body === 'string'
                          ? entry.response.body
                          : JSON.stringify(entry.response.body, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

function StatusBadge({ status, statusText }: { status: number; statusText: string }) {
  const color =
    status < 300
      ? 'text-green-400 bg-green-400/10 border-green-400/30'
      : status < 400
        ? 'text-amber-400 bg-amber-400/10 border-amber-400/30'
        : 'text-red-400 bg-red-400/10 border-red-400/30'

  return (
    <span className={cn('px-1.5 py-0.5 rounded border text-[10px] font-mono font-semibold', color)}>
      {status} {statusText}
    </span>
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

function truncate(str: string, len: number): string {
  return str.length > len ? str.substring(0, len) + '...' : str
}
