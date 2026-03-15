import { ShieldAlert, Trash2 } from 'lucide-react'

interface SecurityWarningsProps {
  onClearCredentials: () => void
}

/**
 * Security notice displayed in the playground.
 * Clearly communicates credential handling to the user.
 */
export function SecurityWarnings({ onClearCredentials }: SecurityWarningsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-900/20 border border-amber-700/30">
        <ShieldAlert className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-300/90 leading-relaxed">
          <p className="font-medium">Your credentials stay in this browser tab.</p>
          <p className="text-amber-400/70 mt-1">
            Stored in sessionStorage only. Never sent to our servers. Cleared when you close the tab.
          </p>
        </div>
      </div>

      <button
        onClick={onClearCredentials}
        className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
      >
        <Trash2 className="h-3 w-3" />
        Clear all credentials now
      </button>
    </div>
  )
}
