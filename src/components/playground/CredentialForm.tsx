import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Play } from 'lucide-react'
import type { OAuthFlowType } from '@/lib/providers'

interface CredentialFormProps {
  flowType: OAuthFlowType
  defaultRedirectUri: string
  defaultScopes: string[]
  onSubmit: (creds: CredentialFormData) => void
  disabled?: boolean
  /** For providers that need an issuer URL (Okta, Auth0) */
  showIssuerUrl?: boolean
}

export interface CredentialFormData {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
  issuerUrl?: string
}

export function CredentialForm({
  flowType,
  defaultRedirectUri,
  defaultScopes,
  onSubmit,
  disabled,
  showIssuerUrl,
}: CredentialFormProps) {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [redirectUri, setRedirectUri] = useState(defaultRedirectUri)
  const [scopes, setScopes] = useState(defaultScopes.join(' '))
  const [issuerUrl, setIssuerUrl] = useState('')

  const needsSecret = flowType === 'authorization_code' || flowType === 'client_credentials'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      clientId,
      clientSecret,
      redirectUri,
      scopes: scopes.split(/\s+/).filter(Boolean),
      issuerUrl: issuerUrl || undefined,
    })
  }

  const isValid = clientId.trim() !== '' && (!needsSecret || clientSecret.trim() !== '')

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {showIssuerUrl && (
        <Field label="Issuer URL" value={issuerUrl} onChange={setIssuerUrl} placeholder="https://dev-xxxxx.okta.com/oauth2/default" />
      )}

      <Field label="Client ID" value={clientId} onChange={setClientId} placeholder="Your OAuth client ID" />

      {needsSecret && (
        <Field
          label="Client Secret"
          value={clientSecret}
          onChange={setClientSecret}
          placeholder="Your client secret"
          type="password"
        />
      )}

      <Field label="Redirect URI" value={redirectUri} onChange={setRedirectUri} placeholder="http://localhost:5173/playground/callback" />

      <Field label="Scopes (space-separated)" value={scopes} onChange={setScopes} placeholder="openid profile email" />

      <Button
        type="submit"
        disabled={disabled || !isValid}
        className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
      >
        <Play className="h-4 w-4" />
        Start Flow
      </Button>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
      />
    </div>
  )
}
