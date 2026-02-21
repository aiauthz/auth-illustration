import { Slide0_PKCE } from '@/slides/Slide0_PKCE'
import { Slide1_OAuthConsent } from '@/slides/Slide1_OAuthConsent'
import { Slide2_AppToApp } from '@/slides/Slide2_AppToApp'
import { Slide3_DelegatedApiKey } from '@/slides/Slide3_DelegatedApiKey'
import { Slide4_AgentAsOAuthClient } from '@/slides/Slide4_AgentAsOAuthClient'
import { Slide5_CrossAppAccess } from '@/slides/Slide5_CrossAppAccess'

export interface SlideMetadata {
  component?: React.ComponentType
  slug: string
  title: string
  description: string
}

export const SLIDES: SlideMetadata[] = [
  {
    component: Slide0_PKCE,
    slug: 'pkce',
    title: 'OAuth 2.0 PKCE Flow',
    description:
      'Learn how Proof Key for Code Exchange (PKCE) protects public clients from authorization code interception attacks.',
  },
  {
    component: Slide1_OAuthConsent,
    slug: 'oauth-consent',
    title: 'Basic OIDC Authentication Flow',
    description:
      'See how users authenticate with an identity provider and grant consent for apps to access their data.',
  },
  {
    component: Slide2_AppToApp,
    slug: 'app-to-app',
    title: 'App-to-App Integration: Calendar \u2194 Zoom',
    description:
      'Explore how two applications securely share data on behalf of a user through OAuth delegation.',
  },
  {
    component: Slide3_DelegatedApiKey,
    slug: 'delegated-api-key',
    title: 'Delegated API Key to AI Agent',
    description:
      'Learn how an AI agent can act on behalf of a user using a delegated API key pattern.',
  },
  {
    component: Slide4_AgentAsOAuthClient,
    slug: 'agent-as-oauth-client',
    title: 'AI Agent as a Registered OAuth Client',
    description:
      'Discover how an AI agent registers as its own OAuth client to request scoped access tokens.',
  },
  {
    component: Slide5_CrossAppAccess,
    slug: 'cross-app-access',
    title: 'Cross App Access (ID-JAG)',
    description:
      'Understand the Identity Assertion Authorization Grant for secure cross-application access.',
  },
]
