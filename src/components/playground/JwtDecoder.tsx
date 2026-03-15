import { useMemo } from 'react'
import { decodeJwt, claimAnnotations, formatTimestamp, timeUntilExpiry } from '@/lib/jwt'
import { cn } from '@/lib/utils'

interface JwtDecoderProps {
  token: string
  label?: string
  className?: string
}

/**
 * Three-panel JWT decoder with color-coded parts and claim annotations.
 * Header = blue, Payload = purple, Signature = orange.
 */
export function JwtDecoder({ token, label, className }: JwtDecoderProps) {
  const decoded = useMemo(() => decodeJwt(token), [token])

  if (!decoded.isValid) {
    return (
      <div className={cn('bg-neutral-900 rounded-lg border border-neutral-800 p-4', className)}>
        {label && <div className="text-xs text-neutral-500 mb-2 font-medium">{label}</div>}
        <div className="text-red-400 text-sm">
          Invalid token: {decoded.error}
        </div>
        <div className="mt-2 text-xs text-neutral-500 font-mono break-all">{token}</div>
      </div>
    )
  }

  return (
    <div className={cn('bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden', className)}>
      {label && (
        <div className="px-4 py-2 border-b border-neutral-800 text-xs font-medium text-neutral-400">
          {label}
        </div>
      )}

      {/* Raw token with color-coded parts */}
      <div className="px-4 py-3 border-b border-neutral-800">
        <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">Encoded</div>
        <div className="font-mono text-xs break-all leading-relaxed">
          <span className="text-blue-400">{decoded.raw.header}</span>
          <span className="text-neutral-600">.</span>
          <span className="text-purple-400">{decoded.raw.payload}</span>
          <span className="text-neutral-600">.</span>
          <span className="text-orange-400">{decoded.raw.signature}</span>
        </div>
      </div>

      {/* Decoded panels */}
      <div className="grid grid-cols-2 divide-x divide-neutral-800">
        {/* Header */}
        <div className="p-3">
          <div className="text-[10px] text-blue-400 uppercase tracking-wider mb-2 font-semibold">
            Header
          </div>
          <ClaimList claims={decoded.header} color="blue" />
        </div>

        {/* Payload */}
        <div className="p-3">
          <div className="text-[10px] text-purple-400 uppercase tracking-wider mb-2 font-semibold">
            Payload
          </div>
          <ClaimList claims={decoded.payload} color="purple" />
        </div>
      </div>
    </div>
  )
}

function ClaimList({
  claims,
  color,
}: {
  claims: Record<string, unknown>
  color: 'blue' | 'purple'
}) {
  const keyColor = color === 'blue' ? 'text-blue-300' : 'text-purple-300'

  return (
    <div className="space-y-1.5 text-xs font-mono">
      {Object.entries(claims).map(([key, value]) => {
        const annotation = claimAnnotations[key]
        const isTimestamp = (key === 'exp' || key === 'iat' || key === 'nbf') && typeof value === 'number'

        return (
          <div key={key}>
            <div className="flex items-start gap-1">
              <span className={cn('flex-shrink-0', keyColor)}>{key}:</span>
              <span className="text-neutral-300 break-all">
                {typeof value === 'string' ? `"${value}"` : String(value)}
              </span>
            </div>
            {/* Annotation line */}
            {(annotation || isTimestamp) && (
              <div className="text-[10px] text-neutral-500 pl-2 mt-0.5">
                {annotation && <span>{annotation.label}</span>}
                {isTimestamp && (
                  <span className="ml-1">
                    ({formatTimestamp(value as number)}
                    {key === 'exp' && (
                      <span className="text-amber-500"> — {timeUntilExpiry(value as number)}</span>
                    )}
                    )
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
