import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, RotateCcw, ArrowRight, ArrowLeft } from 'lucide-react'

interface StepMeta {
  number: number
  caption: string
}

interface SlideLayoutProps {
  title: string
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
  title,
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
    <div className="flex flex-col w-full h-full relative">
      {/* Control Buttons - Top left */}
      <div className="absolute top-4 left-4 z-50 flex gap-2 lg:gap-4">
        {isIdle ? (
          <Button
            onClick={onStart}
            size="default"
            className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700 shadow-lg lg:text-base lg:px-4 lg:py-2"
          >
            <Play className="h-4 w-4 lg:h-5 lg:w-5 lg:mr-2" />
            <span className="hidden lg:inline">{startLabel}</span>
          </Button>
        ) : (
          <>
            <Button
              onClick={onPrevious}
              disabled={!canGoPrevious}
              size="default"
              className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700 disabled:opacity-50 shadow-lg lg:text-base lg:px-4 lg:py-2"
            >
              <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5 lg:mr-2" />
              <span className="hidden lg:inline">Previous</span>
            </Button>
            <Button
              onClick={onNext}
              disabled={!canGoNext}
              size="default"
              className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700 disabled:opacity-50 shadow-lg lg:text-base lg:px-4 lg:py-2"
            >
              <ArrowRight className="h-4 w-4 lg:h-5 lg:w-5 lg:mr-2" />
              <span className="hidden lg:inline">Next Step</span>
            </Button>
            <Button
              onClick={onReset}
              variant="outline"
              size="default"
              className="bg-neutral-900 border-neutral-700 text-neutral-200 hover:bg-neutral-800 shadow-lg lg:text-base lg:px-4 lg:py-2"
            >
              <RotateCcw className="h-4 w-4 lg:h-5 lg:w-5 lg:mr-2" />
              <span className="hidden lg:inline">Reset</span>
            </Button>
          </>
        )}
      </div>

      {/* Slide Title - Top center */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
        <h2 className="text-lg lg:text-2xl font-bold text-neutral-100 bg-neutral-800/90 px-4 py-2 lg:px-6 lg:py-3 rounded-lg shadow-lg border border-neutral-700">
          {title}
        </h2>
      </div>

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
  )
}
