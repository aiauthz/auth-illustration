import { useState, useEffect, useRef } from 'react'
import { Lightbulb, X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface InsightSection {
  heading: string
  variant?: 'positive' | 'negative' | 'neutral'
  items: string[]
}

export interface InsightEntry {
  id: string
  stepId: string
  title: string
  variant: 'positive' | 'negative' | 'mixed'
  description?: string
  sections: InsightSection[]
}

interface InsightsPanelProps {
  entries: InsightEntry[]
  activeStepId: string
}

const entryBorderColor = {
  positive: 'border-l-green-500',
  negative: 'border-l-red-500',
  mixed: 'border-l-amber-500',
}

const entryTitleColor = {
  positive: 'text-green-300',
  negative: 'text-red-300',
  mixed: 'text-amber-300',
}

const sectionHeadingColor = {
  positive: 'text-green-400',
  negative: 'text-red-400',
  neutral: 'text-neutral-400',
}

const sectionItemColor = {
  positive: 'text-green-300/90',
  negative: 'text-red-300/90',
  neutral: 'text-neutral-300',
}

export function InsightsPanel({ entries, activeStepId }: InsightsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const prevStepRef = useRef(activeStepId)

  const activeEntries = entries.filter((e) => e.stepId === activeStepId)
  const hasInsights = activeEntries.length > 0

  // Auto-close when stepping to a step with no insights
  useEffect(() => {
    if (prevStepRef.current !== activeStepId) {
      prevStepRef.current = activeStepId
      if (!entries.some((e) => e.stepId === activeStepId)) {
        setIsOpen(false)
      }
    }
  }, [activeStepId, entries])

  if (!hasInsights) return null

  return (
    <>
      {/* FAB button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          'absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors',
          isOpen
            ? 'bg-amber-700 text-amber-100 hover:bg-amber-600'
            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700',
        )}
      >
        <Lightbulb className="h-4 w-4" />
        <span className="hidden lg:inline">Insights</span>
        <span className="bg-neutral-600 text-neutral-200 text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {activeEntries.length}
        </span>
      </button>

      {/* Side panel */}
      <div
        className={cn(
          'absolute top-0 left-0 bottom-0 w-[340px] z-40 transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="w-full h-full bg-neutral-950/95 border-r border-neutral-700 shadow-[4px_0_20px_rgba(0,0,0,0.5)] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 flex-shrink-0">
            <div className="flex items-center gap-2 text-neutral-300 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              Insights
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-500 hover:text-neutral-300 transition-colors p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable content — menu-bar nested layout */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {activeEntries.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  'border-l-2 mx-3 my-3 rounded-r-md bg-neutral-900/60',
                  entryBorderColor[entry.variant],
                )}
              >
                {/* Entry title bar */}
                <div className="px-3 py-2.5 border-b border-neutral-800/60">
                  <h4 className={cn('text-sm font-bold', entryTitleColor[entry.variant])}>
                    {entry.title}
                  </h4>
                  {entry.description && (
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                      {entry.description}
                    </p>
                  )}
                </div>

                {/* Nested sections */}
                <div className="divide-y divide-neutral-800/40">
                  {entry.sections.map((section, si) => {
                    const sv = section.variant ?? 'neutral'
                    return (
                      <div key={si} className="px-3 py-2.5">
                        <div className={cn('flex items-center gap-1.5 text-xs font-semibold mb-1.5', sectionHeadingColor[sv])}>
                          <ChevronRight className="h-3 w-3 opacity-60" />
                          {section.heading}
                        </div>
                        <ul className="space-y-1 pl-4.5 text-xs">
                          {section.items.map((item, i) => (
                            <li key={i} className={cn('leading-relaxed', sectionItemColor[sv])}>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
