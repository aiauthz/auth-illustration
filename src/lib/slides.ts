import { Slide1_OAuthConsent } from '@/slides/Slide1_OAuthConsent'
import { Slide0_PKCE } from '@/slides/Slide0_PKCE'
import { Slide7_RefreshToken } from '@/slides/Slide7_RefreshToken'
import { Slide6_ClientCredentials } from '@/slides/Slide6_ClientCredentials'
import { Slide2_AppToApp } from '@/slides/Slide2_AppToApp'
import { Slide8_DeviceCode } from '@/slides/Slide8_DeviceCode'
import { Slide9_ImplicitFlow } from '@/slides/Slide9_ImplicitFlow'
import { Slide10_ROPC } from '@/slides/Slide10_ROPC'
import { Slide3_DelegatedApiKey } from '@/slides/Slide3_DelegatedApiKey'
import { Slide4_AgentAsOAuthClient } from '@/slides/Slide4_AgentAsOAuthClient'
import { Slide5_CrossAppAccess } from '@/slides/Slide5_CrossAppAccess'
import slidesData from '@/data/slides.json'

export interface SlideMetadata {
  component?: React.ComponentType
  slug: string
  title: string
  description: string
  category?: string
}

const componentMap: Record<string, React.ComponentType> = {
  'oauth-consent': Slide1_OAuthConsent,
  'pkce': Slide0_PKCE,
  'refresh-token': Slide7_RefreshToken,
  'client-credentials': Slide6_ClientCredentials,
  'app-to-app': Slide2_AppToApp,
  'device-code': Slide8_DeviceCode,
  'implicit-flow': Slide9_ImplicitFlow,
  'ropc': Slide10_ROPC,
  'delegated-api-key': Slide3_DelegatedApiKey,
  'agent-as-oauth-client': Slide4_AgentAsOAuthClient,
  'cross-app-access': Slide5_CrossAppAccess,
}

export const SLIDES: SlideMetadata[] = slidesData.map((slide) => ({
  ...slide,
  component: componentMap[slide.slug],
}))
