import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export interface HttpRequestEntry {
  id: string
  stepId: string
  label: string
  method: 'GET' | 'POST'
  url: string
  headers: { name: string; value: string }[]
  queryParams?: Record<string, string>
  body?: Record<string, string>
  response: {
    status: number
    statusText: string
    headers: { name: string; value: string }[]
    body: unknown
  }
  color: string
}

interface HttpRequestPanelProps {
  entries: HttpRequestEntry[]
  activeStepId: string
}

function JsonView({ data }: { data: unknown }) {
  if (data === null || data === undefined) return null

  const renderValue = (value: unknown, indent: number): React.ReactNode => {
    if (value === undefined) return null
    if (typeof value === 'string') {
      const truncated = value.length > 60 ? value.substring(0, 57) + '...' : value
      return <span className="text-green-400">"{truncated}"</span>
    }
    if (typeof value === 'number') {
      return <span className="text-yellow-400">{value}</span>
    }
    if (typeof value === 'boolean') {
      return <span className="text-yellow-400">{value.toString()}</span>
    }
    if (value === null) {
      return <span className="text-neutral-500">null</span>
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span>[]</span>
      const pad = '  '.repeat(indent)
      const innerPad = '  '.repeat(indent + 1)
      return (
        <span>
          {'[\n'}
          {value.map((item, i) => (
            <span key={i}>
              {innerPad}
              {renderValue(item, indent + 1)}
              {i < value.length - 1 ? ',' : ''}
              {'\n'}
            </span>
          ))}
          {pad}
          {']'}
        </span>
      )
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
      if (entries.length === 0) return <span>{'{}'}</span>
      const pad = '  '.repeat(indent)
      const innerPad = '  '.repeat(indent + 1)
      return (
        <span>
          {'{\n'}
          {entries.map(([key, val], i) => (
            <span key={key}>
              {innerPad}
              <span className="text-cyan-400">"{key}"</span>
              {': '}
              {renderValue(val, indent + 1)}
              {i < entries.length - 1 ? ',' : ''}
              {'\n'}
            </span>
          ))}
          {pad}
          {'}'}
        </span>
      )
    }
    return <span>{String(value)}</span>
  }

  return <pre className="whitespace-pre text-xs leading-relaxed">{renderValue(data, 0)}</pre>
}

function StatusBadge({ status, statusText }: { status: number; statusText: string }) {
  const color =
    status < 300
      ? 'text-green-400 bg-green-400/10 border-green-400/30'
      : status < 400
        ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
        : 'text-red-400 bg-red-400/10 border-red-400/30'

  return (
    <span className={cn('px-2 py-0.5 rounded border text-xs font-mono font-semibold', color)}>
      {status} {statusText}
    </span>
  )
}

function MethodBadge({ method }: { method: 'GET' | 'POST' }) {
  return (
    <span
      className={cn(
        'px-1.5 py-0.5 rounded text-[10px] font-bold font-mono',
        method === 'GET'
          ? 'bg-blue-500/20 text-blue-400'
          : 'bg-emerald-500/20 text-emerald-400',
      )}
    >
      {method}
    </span>
  )
}

export function HttpRequestPanel({ entries, activeStepId }: HttpRequestPanelProps) {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Auto-select when activeStepId matches an entry
  useEffect(() => {
    const match = entries.find((e) => e.stepId === activeStepId)
    if (match) {
      setSelectedEntryId(match.id)
    }
  }, [activeStepId, entries])

  // Auto-select last entry if none selected
  useEffect(() => {
    if (!selectedEntryId && entries.length > 0) {
      setSelectedEntryId(entries[entries.length - 1].id)
    }
  }, [entries, selectedEntryId])

  const selectedEntry = entries.find((e) => e.id === selectedEntryId) ?? null

  if (entries.length === 0) {
    return (
      <div className="w-full h-full bg-neutral-950 flex items-center justify-center font-mono text-xs text-neutral-600">
        HTTP requests will appear here as the flow progresses...
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-neutral-950 grid grid-cols-[220px_1fr_1fr] font-mono text-xs overflow-hidden">
      {/* Col 1: Request list */}
      <div
        ref={listRef}
        className="border-r border-neutral-800 overflow-y-auto py-1"
      >
        {entries.map((entry) => {
          const isActive = entry.stepId === activeStepId
          const isSelected = entry.id === selectedEntryId
          return (
            <button
              key={entry.id}
              onClick={() => setSelectedEntryId(entry.id)}
              className={cn(
                'w-full text-left px-3 py-2 flex items-center gap-2 transition-colors',
                isSelected
                  ? 'bg-neutral-800'
                  : 'hover:bg-neutral-900',
              )}
            >
              <span
                className={cn('w-2 h-2 rounded-full flex-shrink-0', isActive && 'animate-pulse')}
                style={{ backgroundColor: entry.color }}
              />
              <MethodBadge method={entry.method} />
              <span
                className={cn(
                  'truncate',
                  isSelected ? 'text-neutral-200' : 'text-neutral-400',
                )}
              >
                {entry.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Col 2: Request details */}
      <div className="border-r border-neutral-800 overflow-y-auto p-3">
        {selectedEntry ? (
          <div className="space-y-3">
            <div className="text-neutral-500 uppercase tracking-wider text-[10px] font-semibold">
              Request
            </div>
            <div className="flex items-center gap-2">
              <MethodBadge method={selectedEntry.method} />
              <span className="text-neutral-200 break-all">{selectedEntry.url}</span>
            </div>

            {selectedEntry.queryParams &&
              Object.keys(selectedEntry.queryParams).length > 0 && (
                <div>
                  <div className="text-neutral-500 text-[10px] uppercase tracking-wider mb-1">
                    Query Parameters
                  </div>
                  <div className="bg-neutral-900 rounded p-2 space-y-1">
                    {Object.entries(selectedEntry.queryParams).map(([key, value]) => (
                      <div key={key} className="flex">
                        <span className="text-cyan-400 flex-shrink-0">{key}</span>
                        <span className="text-neutral-600 mx-1">=</span>
                        <span className="text-green-400 break-all">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {selectedEntry.headers.length > 0 && (
              <div>
                <div className="text-neutral-500 text-[10px] uppercase tracking-wider mb-1">
                  Headers
                </div>
                <div className="bg-neutral-900 rounded p-2 space-y-1">
                  {selectedEntry.headers.map((h) => (
                    <div key={h.name} className="flex">
                      <span className="text-cyan-400 flex-shrink-0">{h.name}</span>
                      <span className="text-neutral-600 mx-1">:</span>
                      <span className="text-neutral-300 break-all">{h.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedEntry.body && (
              <div>
                <div className="text-neutral-500 text-[10px] uppercase tracking-wider mb-1">
                  Body
                </div>
                <div className="bg-neutral-900 rounded p-2">
                  <JsonView data={selectedEntry.body} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-neutral-600 flex items-center justify-center h-full">
            Select a request
          </div>
        )}
      </div>

      {/* Col 3: Response details */}
      <div className="overflow-y-auto p-3">
        {selectedEntry ? (
          <div className="space-y-3">
            <div className="text-neutral-500 uppercase tracking-wider text-[10px] font-semibold">
              Response
            </div>
            <StatusBadge
              status={selectedEntry.response.status}
              statusText={selectedEntry.response.statusText}
            />

            {selectedEntry.response.headers.length > 0 && (
              <div>
                <div className="text-neutral-500 text-[10px] uppercase tracking-wider mb-1">
                  Headers
                </div>
                <div className="bg-neutral-900 rounded p-2 space-y-1">
                  {selectedEntry.response.headers.map((h) => (
                    <div key={h.name} className="flex">
                      <span className="text-cyan-400 flex-shrink-0">{h.name}</span>
                      <span className="text-neutral-600 mx-1">:</span>
                      <span className="text-neutral-300 break-all">{h.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedEntry.response.body != null && (
              <div>
                <div className="text-neutral-500 text-[10px] uppercase tracking-wider mb-1">
                  Body
                </div>
                <div className="bg-neutral-900 rounded p-2">
                  <JsonView data={selectedEntry.response.body} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-neutral-600 flex items-center justify-center h-full">
            Select a request
          </div>
        )}
      </div>
    </div>
  )
}
