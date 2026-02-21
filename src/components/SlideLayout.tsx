import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, RotateCcw, ArrowRight, ArrowLeft } from 'lucide-react'

interface StepMeta {
  number: number
  caption: string
}

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

/**
 * Shared slide chrome: control buttons, title bar, caption box, and slideNextStep listener.
 * Wraps each slide's Stage + custom overlays.
 */
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

  // Listen for global next step event (from presentation clicker)
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

  return (
    <div className="flex flex-col w-full h-full">
      {/* Control bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-neutral-900/95 border-b border-neutral-800 flex-shrink-0 z-50">
        {isIdle ? (
          <Button
            onClick={onStart}
            size="sm"
            className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
          >
            <Play className="h-4 w-4 mr-1.5" />
            {startLabel}
          </Button>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 relative">
        {/* Closed Caption - Bottom center */}
        {!isIdle && meta && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-[900px] w-[90%]">
            <div className="bg-black/90 text-white px-4 py-3 lg:px-6 lg:py-4 rounded-lg shadow-2xl border border-neutral-700">
              <div className="flex items-start gap-3 lg:gap-4">
                <div className="bg-neutral-700 text-neutral-100 px-2 py-0.5 lg:px-3 lg:py-1 rounded font-bold text-xs lg:text-sm flex-shrink-0 mt-0.5">
                  {meta.number}
                </div>
                <p className="text-sm lg:text-base leading-relaxed">{meta.caption}</p>
              </div>
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  )
}
