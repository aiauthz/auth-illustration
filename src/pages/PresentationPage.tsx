import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { SlideFrame } from '@/components/SlideFrame'
import { Seo } from '@/components/Seo'
import { FlowContent, getFlowContent } from '@/components/FlowContent'
import { SLIDES } from '@/lib/slides'
import { SITE_NAME, SITE_URL, canonicalUrl, getFlowSeo } from '@/lib/seo'
import { analytics } from '@/lib/analytics'

export function PresentationPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const readySlides = useMemo(
    () => SLIDES.filter((s) => s.ready),
    []
  )

  const slugIndex = slug ? readySlides.findIndex((s) => s.slug === slug) : -1
  const slugIsValid = slugIndex !== -1 || !slug
  const initialIndex = Math.max(slugIndex, 0)
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

  // Track flow views in GA4
  useEffect(() => {
    if (slug) analytics.flowView(slug)
  }, [slug])

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
        if (slug) analytics.flowStep(slug, currentSlide)
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

  if (!slugIsValid) {
    return <Navigate to="/404" replace />
  }

  const currentMeta = readySlides[currentSlide - 1]
  const SlideComponent = currentMeta.component!
  const seo = getFlowSeo(currentMeta.slug)
  const content = getFlowContent(currentMeta.slug)
  const h1 = content?.h1 ?? currentMeta.title

  const jsonLd = seo
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: seo.title,
          description: seo.description,
          url: canonicalUrl(seo.path),
          mainEntityOfPage: canonicalUrl(seo.path),
          inLanguage: 'en',
          isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
          about: currentMeta.title,
          articleSection: currentMeta.category,
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'Flows', item: `${SITE_URL}/flows/${currentMeta.slug}` },
            { '@type': 'ListItem', position: 3, name: currentMeta.title, item: canonicalUrl(seo!.path) },
          ],
        },
        ...(content
          ? [
              {
                '@context': 'https://schema.org',
                '@type': 'HowTo',
                name: content.h1,
                description: content.intro,
                inLanguage: 'en',
                step: content.steps.map((s, i) => ({
                  '@type': 'HowToStep',
                  position: i + 1,
                  name: s.name,
                  text: s.text,
                })),
              },
            ]
          : []),
      ]
    : undefined

  return (
    <main>
      {seo && <Seo {...seo} jsonLd={jsonLd} />}
      <h1 className="sr-only">{h1}</h1>
      <SlideFrame>
        <SlideComponent />
      </SlideFrame>
      <FlowContent slug={currentMeta.slug} />
    </main>
  )
}
