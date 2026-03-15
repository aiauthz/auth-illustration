import { cn } from '@/lib/utils'

interface PhoneSimulatorProps {
  children: React.ReactNode
  className?: string
  urlBar?: string
}

/**
 * PhoneSimulator - A mobile phone frame component for device flow visualization.
 * Renders a realistic phone bezel with status bar and optional browser chrome.
 */
export function PhoneSimulator({ children, className, urlBar }: PhoneSimulatorProps) {
  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* Phone body */}
      <div className="relative rounded-[20px] bg-neutral-800 border border-neutral-600 p-[4px] shadow-2xl shadow-black/60">
        {/* Inner screen area */}
        <div
          className="rounded-[16px] bg-neutral-950 overflow-hidden relative flex flex-col"
          style={{ width: '160px', height: '290px' }}
        >
          {/* Status bar */}
          <div className="flex items-center justify-between px-3 py-1 bg-neutral-900/80 text-[7px] text-neutral-400 shrink-0">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              {/* Signal bars */}
              <div className="flex items-end gap-[1px] h-2">
                <div className="w-[2px] h-[3px] bg-neutral-400 rounded-sm" />
                <div className="w-[2px] h-[5px] bg-neutral-400 rounded-sm" />
                <div className="w-[2px] h-[7px] bg-neutral-400 rounded-sm" />
                <div className="w-[2px] h-[8px] bg-neutral-500 rounded-sm" />
              </div>
              {/* WiFi icon simplified */}
              <svg width="8" height="6" viewBox="0 0 8 6" className="text-neutral-400">
                <path
                  d="M4 5.5a.5.5 0 110-1 .5.5 0 010 1zm-1.5-1.5a2.12 2.12 0 013 0M1 2.5a4.24 4.24 0 016 0"
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                />
              </svg>
              {/* Battery */}
              <div className="flex items-center gap-[1px]">
                <div className="w-4 h-[6px] rounded-[1px] border border-neutral-500 p-[1px]">
                  <div className="w-2/3 h-full bg-green-500 rounded-[0.5px]" />
                </div>
                <div className="w-[1px] h-[3px] bg-neutral-500 rounded-r-sm" />
              </div>
            </div>
          </div>

          {/* Browser URL bar */}
          {urlBar && (
            <div className="px-2 py-1 bg-neutral-900 border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-1 bg-neutral-800 rounded-md px-2 py-0.5">
                <svg
                  width="7"
                  height="7"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-green-500 shrink-0"
                >
                  <path
                    d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5z"
                    fill="currentColor"
                  />
                </svg>
                <span className="text-[7px] text-neutral-300 truncate">{urlBar}</span>
              </div>
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 overflow-hidden relative">{children}</div>

          {/* Home indicator bar */}
          <div className="flex justify-center py-1 shrink-0">
            <div className="w-10 h-[3px] bg-neutral-600 rounded-full" />
          </div>
        </div>

        {/* Notch */}
        <div className="absolute top-[4px] left-1/2 -translate-x-1/2 w-14 h-[14px] bg-neutral-800 rounded-b-xl z-10" />
      </div>
    </div>
  )
}
