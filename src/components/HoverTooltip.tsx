import { ReactNode } from 'react'

interface HoverTooltipProps {
  children: ReactNode
  title: string
  description: string
  technicalDetails?: string[]
  className?: string
}

/**
 * HoverTooltip - Shows detailed information on hover
 */
export function HoverTooltip({
  children,
  title,
  description,
  technicalDetails,
  className = '',
}: HoverTooltipProps) {
  return (
    <div className={`group relative ${className}`}>
      {children}
      
      {/* Tooltip */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none">
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl p-4 min-w-[280px] max-w-[400px]">
          {/* Arrow pointing down */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-neutral-700" />
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-[-1px] w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[7px] border-t-neutral-900" />
          
          {/* Content */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-neutral-100 border-b border-neutral-700 pb-2">
              {title}
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {description}
            </p>
            
            {technicalDetails && technicalDetails.length > 0 && (
              <div className="pt-2 border-t border-neutral-800">
                <div className="text-xs font-semibold text-neutral-400 mb-1">
                  Technical Details:
                </div>
                <ul className="space-y-1">
                  {technicalDetails.map((detail, index) => (
                    <li key={index} className="text-xs text-neutral-400 font-mono flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
