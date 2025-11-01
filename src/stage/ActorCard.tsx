import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bot, Shield, User } from 'lucide-react'
import { GoogleCalendarLogo } from '@/components/logos/GoogleCalendarLogo'
import { ZoomLogo } from '@/components/logos/ZoomLogo'
import { HoverTooltip } from '@/components/HoverTooltip'

interface ActorCardProps {
  nodeId: string
}

const actorConfig: Record<
  string,
  {
    title: string
    subtitle?: string
    icon: React.ComponentType<{ className?: string }>
    badge?: string
    description: string
    technicalDetails: string[]
  }
> = {
  user: {
    title: 'User',
    icon: User,
    description: 'End user who wants to authenticate and grant permissions to applications.',
    technicalDetails: [
      'Provides credentials (username/password)',
      'Grants/denies consent',
      'Owns the protected resources',
    ],
  },
  calendar: {
    title: 'Google Calendar',
    subtitle: 'Client App',
    icon: GoogleCalendarLogo,
    badge: 'Client App',
    description: 'OAuth 2.0 client application that needs access to user resources or third-party APIs.',
    technicalDetails: [
      'Client ID: Identifies the application',
      'Client Secret: Authenticates the app',
      'Redirect URI: Where to send responses',
      'Stores and uses access tokens',
    ],
  },
  okta: {
    title: 'Okta',
    subtitle: 'Identity Provider',
    icon: Shield,
    badge: 'IDP',
    description: 'Authorization server that authenticates users and issues tokens.',
    technicalDetails: [
      'Authenticates user credentials',
      'Issues authorization codes',
      'Generates access/ID tokens',
      'Manages scopes & permissions',
    ],
  },
  zoom: {
    title: 'Zoom API',
    subtitle: 'Resource Server',
    icon: ZoomLogo,
    badge: 'API',
    description: 'Protected API that validates tokens and provides resources.',
    technicalDetails: [
      'Validates access tokens',
      'Checks token scopes',
      'Enforces rate limits',
      'Returns protected resources',
    ],
  },
  agent: {
    title: 'AI Agent',
    subtitle: 'Orchestrator',
    icon: Bot,
    badge: 'Orchestrator',
    description: 'Autonomous agent that orchestrates multiple API calls and workflows.',
    technicalDetails: [
      'Uses client credentials flow',
      'Manages multiple tokens',
      'No user interaction required',
      'Machine-to-machine auth',
    ],
  },
}

/**
 * ActorCard - monochrome card component for actors
 * Always visible with explicit styling
 */
export function ActorCard({ nodeId }: ActorCardProps) {
  const config = actorConfig[nodeId]
  
  if (!config) {
    return (
      <Card className="bg-neutral-900 border-neutral-800 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] w-full">
        <CardContent className="flex flex-col items-center justify-center p-6 gap-3 min-h-[120px]">
          <div className="text-neutral-200 text-lg font-semibold">Unknown: {nodeId}</div>
        </CardContent>
      </Card>
    )
  }

  const Icon = config.icon

  return (
    <HoverTooltip
      title={config.title}
      description={config.description}
      technicalDetails={config.technicalDetails}
    >
      <Card className="bg-neutral-900 border-neutral-800 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] w-full hover:border-neutral-600 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-all duration-200 cursor-help">
        <CardContent className="flex flex-col items-center justify-center p-6 gap-3 min-h-[120px]">
          <Icon className="h-8 w-8 text-neutral-200 flex-shrink-0" />
          <div className="text-center">
            <div className="text-lg font-semibold text-neutral-100">{config.title}</div>
            {config.subtitle && (
              <div className="text-xs text-neutral-400 mt-1">{config.subtitle}</div>
            )}
          </div>
          {config.badge && (
            <Badge
              variant="outline"
              className="border-neutral-700 bg-neutral-800 text-neutral-200 text-xs"
            >
              {config.badge}
            </Badge>
          )}
        </CardContent>
      </Card>
    </HoverTooltip>
  )
}