import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bot, Globe, Shield, User, Server } from 'lucide-react'
import { GoogleCalendarLogo } from '@/components/logos/GoogleCalendarLogo'
import { ZoomLogo } from '@/components/logos/ZoomLogo'
import { HoverTooltip } from '@/components/HoverTooltip'

interface ActorCardProps {
  nodeId: string
  roleLabel?: {
    text: string
    color: 'blue' | 'purple' | 'green' | 'orange'
  }
}

const actorConfig: Record<
  string,
  {
    title: string
    subtitle?: string
    icon: React.ComponentType<{ className?: string }>
    badge?: string
    description: string
  }
> = {
  user: {
    title: 'User',
    icon: User,
    description: 'End user who wants to authenticate and grant permissions to applications.',
  },
  calendar: {
    title: 'Google Calendar',
    subtitle: 'Client App',
    icon: GoogleCalendarLogo,
    badge: 'Client App',
    description: 'OAuth 2.0 client application that needs access to user resources or third-party APIs.',
  },
  okta: {
    title: 'Identity Provider',
    subtitle: 'IdP',
    icon: Shield,
    badge: 'IDP',
    description: 'Authorization server that authenticates users and issues tokens.',
  },
  zoom: {
    title: 'Zoom API',
    subtitle: 'Resource Server',
    icon: ZoomLogo,
    badge: 'API',
    description: 'Protected API that validates tokens and provides resources.',
  },
  agent: {
    title: 'AI Agent',
    subtitle: 'Orchestrator',
    icon: Bot,
    badge: 'Orchestrator',
    description: 'Autonomous agent that orchestrates multiple API calls and workflows.',
  },
  service: {
    title: 'Service API',
    subtitle: 'Third-party Service',
    icon: Server,
    badge: 'API',
    description: 'Third-party API service that validates API keys and provides resources.',
  },
  browser: {
    title: 'Browser',
    subtitle: 'SPA / Public Client',
    icon: Globe,
    badge: 'SPA',
    description:
      'Single-page application running in the browser. A public client that cannot securely store secrets.',
  },
  appServer: {
    title: 'App Server',
    subtitle: 'Backend',
    icon: Server,
    badge: 'Backend',
    description:
      'Backend server that securely exchanges authorization codes for tokens and stores secrets.',
  },
  authServer: {
    title: 'Auth Server',
    subtitle: 'Authorization Server',
    icon: Shield,
    badge: 'AuthZ',
    description:
      'Authorization server that authenticates users, validates PKCE challenges, and issues tokens.',
  },
}

/**
 * ActorCard - monochrome card component for actors
 * Always visible with explicit styling
 */
export function ActorCard({ nodeId, roleLabel }: ActorCardProps) {
  const config = actorConfig[nodeId]
  
  const roleLabelColors = {
    blue: 'bg-blue-600/90 border-blue-400',
    purple: 'bg-purple-600/90 border-purple-400',
    green: 'bg-green-600/90 border-green-400',
    orange: 'bg-orange-600/90 border-orange-400',
  }
  
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
    <div className="relative w-full">
      {/* Role Label - positioned above the card */}
      {roleLabel && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-10">
          <div className={`${roleLabelColors[roleLabel.color]} text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold border whitespace-nowrap`}>
            {roleLabel.text}
          </div>
        </div>
      )}
      
      <HoverTooltip
        title={config.title}
        description={config.description}
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
    </div>
  )
}