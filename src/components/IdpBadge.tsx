import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield } from 'lucide-react'

interface IdpBadgeProps {
  className?: string
}

/**
 * Badge component for Identity Provider (IdP)
 */
export function IdpBadge({ className }: IdpBadgeProps) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center p-6 gap-3 min-w-[200px]">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <div className="text-xl font-bold">Identity Provider</div>
        </div>
        <Badge variant="secondary">IDP</Badge>
        <div className="text-sm text-muted-foreground text-center">
          Identity Provider
        </div>
      </CardContent>
    </Card>
  )
}
