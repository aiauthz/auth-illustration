import { cn } from '@/lib/utils'

interface TVSimulatorProps {
  children: React.ReactNode
  className?: string
  powered?: boolean
}

/**
 * TVSimulator - A smart TV frame component for device flow visualization.
 * Renders a realistic TV bezel with a stand, wrapping the provided content.
 */
export function TVSimulator({ children, className, powered = true }: TVSimulatorProps) {
  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* TV Body */}
      <div className="relative">
        {/* Outer bezel */}
        <div className="rounded-xl bg-neutral-800 border border-neutral-700 p-[6px] shadow-2xl shadow-black/60">
          {/* Inner screen */}
          <div
            className={cn(
              'rounded-lg overflow-hidden relative',
              powered ? 'bg-neutral-950' : 'bg-black',
            )}
            style={{ width: '280px', height: '176px' }}
          >
            {/* Screen glare overlay */}
            <div
              className="absolute inset-0 z-10 pointer-events-none"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.01) 100%)',
              }}
            />
            {/* Power indicator */}
            <div
              className={cn(
                'absolute bottom-1.5 right-2 w-1.5 h-1.5 rounded-full z-10 transition-colors duration-500',
                powered ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]' : 'bg-neutral-700',
              )}
            />
            {/* Content */}
            <div className="relative z-0 w-full h-full">{children}</div>
          </div>
        </div>
        {/* Brand label */}
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] text-neutral-600 tracking-[0.2em] uppercase font-medium">
          Smart TV
        </div>
      </div>
      {/* Stand neck */}
      <div className="w-3 h-3 bg-neutral-700 rounded-sm" />
      {/* Stand base */}
      <div className="w-20 h-1.5 bg-neutral-700 rounded-full" />
    </div>
  )
}
