import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bot, Shield, User } from 'lucide-react'
import { GoogleCalendarLogo } from '@/components/logos/GoogleCalendarLogo'
import { ZoomLogo } from '@/components/logos/ZoomLogo'

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
  }
> = {
  user: {
    title: 'User',
    icon: User,
  },
  calendar: {
    title: 'Google Calendar',
    subtitle: 'Client App',
    icon: GoogleCalendarLogo,
    badge: 'Client App',
  },
  okta: {
    title: 'Okta',
    subtitle: 'Identity Provider',
    icon: Shield,
    badge: 'IDP',
  },
  zoom: {
    title: 'Zoom API',
    subtitle: 'Resource Server',
    icon: ZoomLogo,
    badge: 'API',
  },
  agent: {
    title: 'AI Agent',
    subtitle: 'Orchestrator',
    icon: Bot,
    badge: 'Orchestrator',
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
    <Card className="bg-neutral-900 border-neutral-800 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] w-full">
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
  )
}