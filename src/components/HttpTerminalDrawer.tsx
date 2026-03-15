import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Terminal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HttpRequestPanel, type HttpRequestEntry } from '@/components/HttpRequestPanel'

interface HttpTerminalDrawerProps {
  entries: HttpRequestEntry[]
  activeStepId: string
}

/**
 * Reusable HTTP terminal drawer — slides up from bottom with spring animation.
 */
export function HttpTerminalDrawer({ entries, activeStepId }: HttpTerminalDrawerProps) {
  const [showTerminal, setShowTerminal] = useState(false)

  if (entries.length === 0) return null

  return (
    <>
      {/* Toggle button — top right */}
      <motion.button
        onClick={() => setShowTerminal((v) => !v)}
        className={cn(
          'absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors',
          showTerminal
            ? 'bg-neutral-700 text-neutral-100 hover:bg-neutral-600'
            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700',
        )}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Terminal className="h-4 w-4" />
        <span className="hidden lg:inline">HTTP Log</span>
        <motion.span
          key={entries.length}
          className="bg-neutral-600 text-neutral-200 text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
          initial={{ scale: 1.4 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        >
          {entries.length}
        </motion.span>
      </motion.button>

      {/* Drawer */}
      <AnimatePresence>
        {showTerminal && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-50"
            style={{ height: '45%' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="w-full h-full bg-neutral-950 border-t border-neutral-700 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 flex-shrink-0">
                <div className="flex items-center gap-2 text-neutral-400 text-xs font-mono">
                  <Terminal className="h-3.5 w-3.5" />
                  HTTP Request Log
                </div>
                <button
                  onClick={() => setShowTerminal(false)}
                  className="text-neutral-500 hover:text-neutral-300 transition-colors p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <HttpRequestPanel entries={entries} activeStepId={activeStepId} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
