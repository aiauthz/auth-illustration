import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SlideFrame } from '@/components/SlideFrame'
import { SLIDES } from '@/lib/slides'

export function PresentationPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const readySlides = useMemo(
    () => SLIDES.filter((s) => s.component),
    []
  )

  const initialIndex = Math.max(
    readySlides.findIndex((s) => s.slug === slug),
    0
  )
  const [currentSlide, setCurrentSlide] = useState(initialIndex + 1)

  // Sync URL when slide changes
  useEffect(() => {
    const current = readySlides[currentSlide - 1]
    if (current && current.slug !== slug) {
      navigate(`/flows/${current.slug}`, { replace: true })
    }
  }, [currentSlide, slug, navigate, readySlides])

  // Sync slide when URL changes (e.g. browser back/forward)
  useEffect(() => {
    const idx = readySlides.findIndex((s) => s.slug === slug)
    if (idx !== -1 && idx + 1 !== currentSlide) {
      setCurrentSlide(idx + 1)
    }
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === ' ' ||
        e.key === 'ArrowRight' ||
        e.key === 'PageDown' ||
        e.key === 'n'
      ) {
        e.preventDefault()
        const event = new CustomEvent('slideNextStep')
        window.dispatchEvent(event)
      } else if (
        e.key === 'ArrowLeft' ||
        e.key === 'PageUp' ||
        e.key === 'p'
      ) {
        e.preventDefault()
        if (currentSlide > 1) {
          setCurrentSlide(currentSlide - 1)
        }
      } else if (/^[1-9]$/.test(e.key)) {
        const slideNum = parseInt(e.key, 10)
        if (slideNum >= 1 && slideNum <= readySlides.length) {
          setCurrentSlide(slideNum)
        }
      } else if (e.key === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen()
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen()
        } else {
          document.exitFullscreen()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentSlide, readySlides.length])

  const handleSlideChange = (slide: number) => {
    if (slide >= 1 && slide <= readySlides.length) {
      setCurrentSlide(slide)
    }
  }

  const SlideComponent = readySlides[currentSlide - 1].component!

  return (
    <SlideFrame
      currentSlide={currentSlide}
      totalSlides={readySlides.length}
      slideTitle={readySlides[currentSlide - 1].title}
      onSlideChange={handleSlideChange}
    >
      <SlideComponent />
    </SlideFrame>
  )
}
