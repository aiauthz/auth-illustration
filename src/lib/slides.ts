import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import slidesData from '@/data/slides.json'

export interface SlideMetadata {
  slug: string
  title: string
  description: string
  category?: string
  /** True when a real visualization component exists for this slide. */
  ready: boolean
  /** Lazy-loaded slide component. Only present when ready=true. */
  component?: LazyExoticComponent<ComponentType>
}

const componentLoaders: Record<string, () => Promise<{ default: ComponentType }>> = {
  'oauth-consent': () => import('@/slides/Slide1_OAuthConsent').then((m) => ({ default: m.Slide1_OAuthConsent })),
  'pkce': () => import('@/slides/Slide0_PKCE').then((m) => ({ default: m.Slide0_PKCE })),
  'refresh-token': () => import('@/slides/Slide7_RefreshToken').then((m) => ({ default: m.Slide7_RefreshToken })),
  'client-credentials': () => import('@/slides/Slide6_ClientCredentials').then((m) => ({ default: m.Slide6_ClientCredentials })),
  'app-to-app': () => import('@/slides/Slide2_AppToApp').then((m) => ({ default: m.Slide2_AppToApp })),
  'device-code': () => import('@/slides/Slide8_DeviceCode').then((m) => ({ default: m.Slide8_DeviceCode })),
  'implicit-flow': () => import('@/slides/Slide9_ImplicitFlow').then((m) => ({ default: m.Slide9_ImplicitFlow })),
  'ropc': () => import('@/slides/Slide10_ROPC').then((m) => ({ default: m.Slide10_ROPC })),
  'delegated-api-key': () => import('@/slides/Slide3_DelegatedApiKey').then((m) => ({ default: m.Slide3_DelegatedApiKey })),
  'agent-as-oauth-client': () => import('@/slides/Slide4_AgentAsOAuthClient').then((m) => ({ default: m.Slide4_AgentAsOAuthClient })),
  'cross-app-access': () => import('@/slides/Slide5_CrossAppAccess').then((m) => ({ default: m.Slide5_CrossAppAccess })),
}

export const SLIDES: SlideMetadata[] = slidesData.map((slide) => {
  const loader = componentLoaders[slide.slug]
  return {
    ...slide,
    ready: !!loader,
    component: loader ? lazy(loader) : undefined,
  }
})
