import { PROVIDERS, type OAuthProviderConfig } from '@/lib/providers'
import { cn } from '@/lib/utils'

interface ProviderSelectorProps {
  selectedId: string
  onSelect: (provider: OAuthProviderConfig) => void
}

export function ProviderSelector({ selectedId, onSelect }: ProviderSelectorProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-400 mb-1.5">Provider</label>
      <div className="grid grid-cols-2 gap-1.5">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            onClick={() => onSelect(provider)}
            className={cn(
              'px-3 py-2 rounded-md text-sm font-medium transition-colors text-left',
              selectedId === provider.id
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-neutral-600',
            )}
          >
            {provider.name}
          </button>
        ))}
      </div>
    </div>
  )
}
