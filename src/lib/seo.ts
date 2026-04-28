import seoData from '@/data/seo.json'
import { SLIDES } from '@/lib/slides'

export const SITE_URL = seoData.site.url
export const SITE_NAME = seoData.site.name
export const DEFAULT_OG_IMAGE = seoData.site.image
export const TWITTER_HANDLE = seoData.site.twitter
export const SITE_LOCALE = seoData.site.locale

export interface PageSeo {
  title: string
  description: string
  path: string
  image?: string
  type?: 'website' | 'article'
}

export const HOME_SEO: PageSeo = { ...seoData.home, type: 'website' }
export const PLAYGROUND_SEO: PageSeo = { ...seoData.playground, type: 'website' }

export function getFlowSeo(slug: string): PageSeo | null {
  const slide = SLIDES.find((s) => s.slug === slug)
  if (!slide) return null
  const override = (seoData.flows as Record<string, { title: string; description: string }>)[slug]
  return {
    title: override?.title ?? `${slide.title} — OAuth Flow Visualized | oauthflows`,
    description: override?.description ?? slide.description,
    path: `/flows/${slug}`,
    type: 'article',
  }
}

export function canonicalUrl(path: string): string {
  return `${SITE_URL}${path === '/' ? '' : path}`
}
