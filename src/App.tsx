import { useState, useEffect } from 'react'
import { SlideFrame } from '@/components/SlideFrame'
import { Slide1_OAuthConsent } from '@/slides/Slide1_OAuthConsent'
import { Slide2_AppToApp } from '@/slides/Slide2_AppToApp'
import { Slide3_DelegatedApiKey } from '@/slides/Slide3_DelegatedApiKey'
import { Slide4_AgentAsOAuthClient } from '@/slides/Slide4_AgentAsOAuthClient'
import { Slide5_CrossAppAccess } from '@/slides/Slide5_CrossAppAccess'

const SLIDES = [
  {
    component: Slide1_OAuthConsent,
  },
  {
    component: Slide2_AppToApp,
  },
  {
    component: Slide3_DelegatedApiKey,
  },
  {
    component: Slide4_AgentAsOAuthClient,
  },
  {
    component: Slide5_CrossAppAccess,
  },
]

/**
 * Main App component with slide navigation and keyboard controls
 */
function App() {
  const [currentSlide, setCurrentSlide] = useState(1)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Presentation clicker forward: Space, ArrowRight, PageDown, or 'n'
      if (
        e.key === ' ' ||
        e.key === 'ArrowRight' ||
        e.key === 'PageDown' ||
        e.key === 'n'
      ) {
        e.preventDefault()
        // Trigger next step on current slide
        const event = new CustomEvent('slideNextStep')
        window.dispatchEvent(event)
      }
      // Presentation clicker backward: ArrowLeft, PageUp, or 'p'
      else if (
        e.key === 'ArrowLeft' ||
        e.key === 'PageUp' ||
        e.key === 'p'
      ) {
        e.preventDefault()
        // Trigger previous slide
        if (currentSlide > 1) {
          setCurrentSlide(currentSlide - 1)
        }
      }
      // Number keys: 1, 2, 3, 4, 5 - Jump to slide
      else if (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4' || e.key === '5') {
        const slideNum = parseInt(e.key, 10)
        if (slideNum >= 1 && slideNum <= SLIDES.length) {
          setCurrentSlide(slideNum)
        }
      }
      // Escape - Exit fullscreen
      else if (e.key === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen()
      }
      // F key - Toggle fullscreen
      else if (e.key === 'f' || e.key === 'F') {
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
  }, [currentSlide])

  const handleSlideChange = (slide: number) => {
    if (slide >= 1 && slide <= SLIDES.length) {
      setCurrentSlide(slide)
    }
  }

  const currentSlideData = SLIDES[currentSlide - 1]
  const SlideComponent = currentSlideData.component

  return (
    <SlideFrame
      currentSlide={currentSlide}
      totalSlides={SLIDES.length}
      onSlideChange={handleSlideChange}
    >
      <SlideComponent />
    </SlideFrame>
  )
}

export default App