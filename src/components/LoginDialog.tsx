import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogin: (username: string, password: string) => void
  title?: string
  description?: string
  defaultUsername?: string
  defaultPassword?: string
}

/**
 * Login Dialog - user enters username and password
 */
export function LoginDialog({
  open,
  onOpenChange,
  onLogin,
  title = 'Sign in to Okta',
  description = 'Enter your credentials to continue',
  defaultUsername = 'alex.chen@techcorp.com',
  defaultPassword = 'SecurePass123!',
}: LoginDialogProps) {
  const [username, setUsername] = useState(defaultUsername)
  const [password, setPassword] = useState(defaultPassword)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (username && password) {
      onLogin(username, password)
      // Keep the values for next time
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-neutral-100">{title}</DialogTitle>
          <DialogDescription className="text-neutral-400">
            {description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-neutral-300">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="user@example.com"
              className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-neutral-300">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
              disabled={!username || !password}
            >
              Sign In
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
