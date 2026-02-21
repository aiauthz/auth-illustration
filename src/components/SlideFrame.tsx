import { ChevronLeft, ChevronRight, Maximize, Minimize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'

interface SlideFrameProps {
  currentSlide: number
  totalSlides: number
  slideTitle: string
  onSlideChange: (slide: number) => void
  children: React.ReactNode
}

/**
 * Shared layout for slides with full-screen grid and navigation in top bar
 */
export function SlideFrame({
  currentSlide,
  totalSlides,
  slideTitle,
  onSlideChange,
  children,
}: SlideFrameProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const handlePrev = () => {
    if (currentSlide > 1) {
      onSlideChange(currentSlide - 1)
    }
  }

  const handleNext = () => {
    if (currentSlide < totalSlides) {
      onSlideChange(currentSlide + 1)
    }
  }

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }

  return (
    <div className="flex flex-col h-screen w-full bg-neutral-950 overflow-hidden">
      {/* Header with all navigation */}
      <header className="relative flex items-center justify-between px-6 py-3 bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-800 flex-shrink-0 z-50">
        <div className="flex items-center gap-2">
          {/* Slide number buttons */}
          {Array.from({ length: totalSlides }, (_, i) => i + 1).map((num) => (
            <Button
              key={num}
              variant="outline"
              size="icon"
              onClick={() => onSlideChange(num)}
              disabled={currentSlide === num}
              aria-label={`Go to slide ${num}`}
              className={`h-8 w-8 text-xs bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700 disabled:opacity-50 ${
                currentSlide === num ? 'bg-neutral-700 border-neutral-600' : ''
              }`}
            >
              {num}
            </Button>
          ))}

          {/* Arrow navigation */}
          <div className="flex items-center gap-2 ml-2 border-l border-neutral-700 pl-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              disabled={currentSlide === 1}
              aria-label="Previous slide"
              className="h-8 w-8 bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={currentSlide === totalSlides}
              aria-label="Next slide"
              className="h-8 w-8 bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Slide title — absolutely centered */}
        <h2 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm lg:text-base font-semibold text-neutral-100 px-4 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800/90 whitespace-nowrap">
          {slideTitle}
        </h2>

        {/* Fullscreen toggle */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="h-8 w-8 bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700"
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Full-screen content area */}
      <main className="flex-1 w-full h-full overflow-hidden bg-neutral-950 relative">
        {children}
      </main>
    </div>
  )
}