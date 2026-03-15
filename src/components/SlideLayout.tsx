import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Play, RotateCcw, ArrowRight, ArrowLeft, Eye, Brain, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StepMeta {
  number: number
  /** What is happening (the action) */
  caption: string
  /** Why this step exists (the motivation) */
  why?: string
  /** What goes wrong without this step (the risk) */
  risk?: string
  /**
   * Step type — controls how SlideLayout renders this step.
   * - 'flow' (default): Normal flow step with caption bar at bottom, Stage visible
   * - 'title': Full-screen title card (big text, dimmed Stage)
   * - 'text': Full-screen text with body content (dimmed Stage)
   * - 'summary': Full-screen summary with bullet points (dimmed Stage)
   */
  type?: 'flow' | 'title' | 'text' | 'summary'
  /** For title/text steps: large heading */
  heading?: string
  /** For text steps: body paragraphs */
  body?: string
  /** For summary steps: bullet points */
  bullets?: string[]
  /** For title steps: optional tag/label */
  tag?: string
  /** Color accent for the step */
  accent?: 'blue' | 'amber' | 'red' | 'green' | 'purple' | 'neutral'
}

export type CaptionDepth = 'what' | 'why' | 'risk'

interface SlideLayoutProps {
  title?: string
  flowStep: string
  stepMetadata: Record<string, StepMeta | null>
  onStart: () => void
  onNext: () => void
  onPrevious: () => void
  onReset: () => void
  canGoNext: boolean
  canGoPrevious: boolean
  startLabel?: string
  children: React.ReactNode
}

const depthConfig: Record<CaptionDepth, { label: string; icon: typeof Eye; color: string; bgColor: string; borderColor: string }> = {
  what: { label: 'What', icon: Eye, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  why: { label: 'Why', icon: Brain, color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
  risk: { label: 'Risk', icon: ShieldAlert, color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
}

const DEPTH_ORDER: CaptionDepth[] = ['what', 'why', 'risk']

const accentColors: Record<string, { text: string; border: string; bg: string; tag: string }> = {
  blue: { text: 'text-blue-300', border: 'border-blue-800/40', bg: 'bg-blue-950/40', tag: 'bg-blue-600/20 text-blue-400 border-blue-500/30' },
  amber: { text: 'text-amber-300', border: 'border-amber-800/40', bg: 'bg-amber-950/40', tag: 'bg-amber-600/20 text-amber-400 border-amber-500/30' },
  red: { text: 'text-red-300', border: 'border-red-800/40', bg: 'bg-red-950/40', tag: 'bg-red-600/20 text-red-400 border-red-500/30' },
  green: { text: 'text-green-300', border: 'border-green-800/40', bg: 'bg-green-950/40', tag: 'bg-green-600/20 text-green-400 border-green-500/30' },
  purple: { text: 'text-purple-300', border: 'border-purple-800/40', bg: 'bg-purple-950/40', tag: 'bg-purple-600/20 text-purple-400 border-purple-500/30' },
  neutral: { text: 'text-neutral-300', border: 'border-neutral-700', bg: 'bg-neutral-900/80', tag: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
}

export function SlideLayout({
  title: _title,
  flowStep,
  stepMetadata,
  onStart,
  onNext,
  onPrevious,
  onReset,
  canGoNext,
  canGoPrevious,
  startLabel = 'Start Flow',
  children,
}: SlideLayoutProps) {
  const isIdle = flowStep === 'idle'
  const meta = stepMetadata[flowStep] ?? null
  const [depth, setDepth] = useState<CaptionDepth>('what')

  const stepType = meta?.type ?? 'flow'
  const isOverlayStep = stepType === 'title' || stepType === 'text' || stepType === 'summary'

  useEffect(() => {
    const handleGlobalNextStep = () => {
      if (isIdle) {
        onStart()
      } else if (canGoNext) {
        onNext()
      }
    }

    window.addEventListener('slideNextStep', handleGlobalNextStep)
    return () => {
      window.removeEventListener('slideNextStep', handleGlobalNextStep)
    }
  }, [isIdle, canGoNext, onStart, onNext])

  const getCaptionText = (m: StepMeta): string | null => {
    switch (depth) {
      case 'why':
        return m.why || null
      case 'risk':
        return m.risk || null
      default:
        return m.caption
    }
  }

  const captionText = meta ? getCaptionText(meta) : null
  const effectiveText = captionText || (meta ? meta.caption : null)
  const effectiveDepth = captionText ? depth : 'what'
  const hasMultipleDepths = meta && (meta.why || meta.risk) && stepType === 'flow'

  const accent = accentColors[meta?.accent ?? 'neutral']

  return (
    <div className="flex flex-col w-full h-full">
      {/* Control bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-neutral-900/95 border-b border-neutral-800 flex-shrink-0 z-50">
        <AnimatePresence mode="wait">
          {isIdle ? (
            <motion.div
              key="start"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                onClick={onStart}
                size="sm"
                className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
              >
                <Play className="h-4 w-4 mr-1.5" />
                {startLabel}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="controls"
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                onClick={onPrevious}
                disabled={!canGoPrevious}
                size="sm"
                className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700 disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Previous
              </Button>
              <Button
                onClick={onNext}
                disabled={!canGoNext}
                size="sm"
                className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700 disabled:opacity-50"
              >
                <ArrowRight className="h-4 w-4 mr-1.5" />
                Next Step
              </Button>
              <Button
                onClick={onReset}
                variant="outline"
                size="sm"
                className="bg-neutral-900 border-neutral-700 text-neutral-200 hover:bg-neutral-800"
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Reset
              </Button>

              {hasMultipleDepths && (
                <div className="flex items-center gap-1 ml-auto border-l border-neutral-700 pl-3">
                  {DEPTH_ORDER.map((d) => {
                    const dc = depthConfig[d]
                    const Icon = dc.icon
                    const isActive = depth === d
                    const hasContent = d === 'what' || (d === 'why' && meta?.why) || (d === 'risk' && meta?.risk)
                    if (!hasContent) return null
                    return (
                      <button
                        key={d}
                        onClick={() => setDepth(d)}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                          isActive
                            ? `${dc.bgColor} ${dc.color} ${dc.borderColor} border`
                            : 'text-neutral-500 hover:text-neutral-300',
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {dc.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 relative">
        {/* Stage / children — always rendered but dimmed for overlay steps */}
        <div className={cn(
          'w-full h-full transition-all duration-500',
          isOverlayStep ? 'opacity-[0.07] blur-md scale-[1.02]' : 'opacity-100 blur-0 scale-100',
        )}>
          {children}
        </div>

        {/* Full-screen overlay for title/text/summary steps */}
        <AnimatePresence mode="wait">
          {isOverlayStep && meta && (
            <motion.div
              key={`overlay-${flowStep}`}
              className="absolute inset-0 z-40 flex items-center justify-center p-8 lg:p-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="max-w-3xl w-full">
                {/* Title step — big centered heading */}
                {stepType === 'title' && (
                  <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  >
                    {meta.tag && (
                      <motion.span
                        className={cn('inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full border mb-6', accent.tag)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        {meta.tag}
                      </motion.span>
                    )}
                    <motion.h1
                      className="text-4xl lg:text-6xl font-bold text-neutral-100 leading-tight"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1, duration: 0.5 }}
                    >
                      {meta.heading || meta.caption}
                    </motion.h1>
                    {meta.body && (
                      <motion.p
                        className="mt-6 text-lg lg:text-xl text-neutral-400 leading-relaxed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        {meta.body}
                      </motion.p>
                    )}
                  </motion.div>
                )}

                {/* Text step — heading + body paragraph */}
                {stepType === 'text' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    {meta.tag && (
                      <span className={cn('inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full border mb-4', accent.tag)}>
                        {meta.tag}
                      </span>
                    )}
                    <h2 className="text-2xl lg:text-4xl font-bold text-neutral-100 leading-tight mb-6">
                      {meta.heading || meta.caption}
                    </h2>
                    {meta.body && (
                      <motion.p
                        className="text-base lg:text-lg text-neutral-400 leading-relaxed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        {meta.body}
                      </motion.p>
                    )}
                  </motion.div>
                )}

                {/* Summary step — heading + bullet list */}
                {stepType === 'summary' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    {meta.tag && (
                      <span className={cn('inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full border mb-4', accent.tag)}>
                        {meta.tag}
                      </span>
                    )}
                    <h2 className="text-2xl lg:text-3xl font-bold text-neutral-100 leading-tight mb-8">
                      {meta.heading || meta.caption}
                    </h2>
                    {meta.bullets && (
                      <div className="space-y-3">
                        {meta.bullets.map((bullet, i) => {
                          const [title, ...rest] = bullet.split(': ')
                          const hasTitle = rest.length > 0
                          const body = hasTitle ? rest.join(': ') : bullet
                          return (
                            <motion.div
                              key={i}
                              className={cn(
                                'flex items-start gap-4 rounded-xl border px-5 py-4',
                                accent.border,
                                'bg-neutral-900/60 backdrop-blur-sm',
                              )}
                              initial={{ opacity: 0, x: -30, scale: 0.95 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              transition={{
                                delay: 0.15 + i * 0.12,
                                type: 'spring',
                                stiffness: 200,
                                damping: 20,
                              }}
                            >
                              <span className={cn(
                                'flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold flex-shrink-0 mt-0.5',
                                accent.bg,
                                accent.text,
                              )}>
                                {i + 1}
                              </span>
                              <div className="min-w-0">
                                {hasTitle && (
                                  <span className={cn('font-semibold text-sm lg:text-base', accent.text)}>
                                    {title}
                                  </span>
                                )}
                                <p className={cn(
                                  'text-sm lg:text-base leading-relaxed',
                                  hasTitle ? 'text-neutral-400 mt-0.5' : accent.text,
                                )}>
                                  {body}
                                </p>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom caption — only for flow steps */}
        <AnimatePresence mode="wait">
          {!isIdle && meta && !isOverlayStep && effectiveText && (
            <motion.div
              key={`${flowStep}-${effectiveDepth}`}
              className="absolute bottom-4 left-1/2 z-50 max-w-[900px] w-[90%]"
              style={{ x: '-50%' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <div className={cn(
                'text-white px-4 py-3 lg:px-6 lg:py-4 rounded-lg shadow-2xl border',
                effectiveDepth === 'risk'
                  ? 'bg-red-950/90 border-red-800/50'
                  : effectiveDepth === 'why'
                    ? 'bg-amber-950/90 border-amber-800/50'
                    : 'bg-black/90 border-neutral-700',
              )}>
                <div className="flex items-start gap-3 lg:gap-4">
                  <motion.div
                    className={cn(
                      'px-2 py-0.5 lg:px-3 lg:py-1 rounded font-bold text-xs lg:text-sm flex-shrink-0 mt-0.5',
                      effectiveDepth === 'risk'
                        ? 'bg-red-800 text-red-100'
                        : effectiveDepth === 'why'
                          ? 'bg-amber-800 text-amber-100'
                          : 'bg-neutral-700 text-neutral-100',
                    )}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    {effectiveDepth === 'risk' ? '!' : effectiveDepth === 'why' ? '?' : meta.number}
                  </motion.div>
                  <div>
                    {effectiveDepth !== 'what' && (
                      <span className={cn(
                        'text-xs font-semibold uppercase tracking-wider',
                        effectiveDepth === 'risk' ? 'text-red-400' : 'text-amber-400',
                      )}>
                        {effectiveDepth === 'risk' ? 'Without this: ' : 'Why: '}
                      </span>
                    )}
                    <span className="text-sm lg:text-base leading-relaxed">{effectiveText}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
