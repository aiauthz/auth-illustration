import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

interface Scope {
  key: string
  description: string
}

interface ConsentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appName: string
  scopes: Scope[]
  onAllow: () => void
  onDeny: () => void
  variant?: 'default' | 'app-to-app'
  title?: string
  description?: string
}

/**
 * Mock consent modal for OAuth flows - monochrome theme
 */
export function ConsentDialog({
  open,
  onOpenChange,
  appName,
  scopes,
  onAllow,
  onDeny,
  variant = 'default',
  title: titleOverride,
  description: descriptionOverride,
}: ConsentDialogProps) {
  const handleAllow = () => {
    onAllow()
    onOpenChange(false)
  }

  const handleDeny = () => {
    onDeny()
    onOpenChange(false)
  }

  const title = titleOverride ?? (
    variant === 'app-to-app'
      ? `Google Calendar wants to access ${appName} API`
      : `${appName} wants access`
  )

  const description = descriptionOverride ?? (
    variant === 'app-to-app'
      ? 'This will allow the app to access these permissions on your behalf.'
      : 'Review the permissions that this app is requesting.'
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-neutral-900 border-neutral-800 text-neutral-200">
        <DialogHeader>
          <DialogTitle className="text-neutral-100">{title}</DialogTitle>
          <DialogDescription className="text-neutral-400">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-3">
            {scopes.map((scope) => (
              <div key={scope.key} className="flex items-start gap-3 p-3 rounded-lg border border-neutral-800 bg-neutral-900/50">
                <Check className="h-5 w-5 text-neutral-300 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-neutral-100">{scope.key}</div>
                  <div className="text-sm text-neutral-400 mt-1">{scope.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleDeny} className="bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700">
            Deny
          </Button>
          <Button onClick={handleAllow} className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700">
            Allow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}