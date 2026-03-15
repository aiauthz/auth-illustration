import { TVSimulator } from './TVSimulator'
import { PhoneSimulator } from './PhoneSimulator'
import { cn } from '@/lib/utils'
import { CheckCircle2, Loader2 } from 'lucide-react'

type DeviceFlowStep =
  | 'idle'
  | 'device_requests_code'
  | 'device_receives_code'
  | 'device_shows_code'
  | 'user_visits_url'
  | 'user_enters_code'
  | 'user_grants_consent'
  | 'device_polls_pending'
  | 'device_polls_success'
  | 'device_authenticated'

/** Netflix "N" logo as inline SVG */
function NetflixN({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M5 2l5.5 20H14L8.5 2H5z" fill="#E50914" />
      <path d="M19 2h-3.5L10 22h3.5L19 2z" fill="#E50914" />
      <path d="M5 2h3.5v20H5V2z" fill="#B1060F" />
      <path d="M15.5 2H19v20h-3.5V2z" fill="#E50914" />
    </svg>
  )
}

/* ── TV Screen Content ────────────────────────────────── */

function TVContent({
  flowStep,
  pollCount,
}: {
  flowStep: DeviceFlowStep
  pollCount: number
}) {
  // Idle / not yet started
  if (flowStep === 'idle') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-black">
        <NetflixN className="w-10 h-10 opacity-30" />
      </div>
    )
  }

  // Requesting code from auth server
  if (flowStep === 'device_requests_code') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#141414]">
        <NetflixN className="w-8 h-8" />
        <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
        <span className="text-[9px] text-neutral-400">Loading...</span>
      </div>
    )
  }

  // Code received
  if (flowStep === 'device_receives_code') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#141414]">
        <NetflixN className="w-8 h-8" />
        <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
        <span className="text-[8px] text-neutral-400">Preparing activation...</span>
      </div>
    )
  }

  // Display code on screen — the classic Netflix activation screen
  if (flowStep === 'device_shows_code') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center px-3 bg-[#141414]">
        <NetflixN className="w-6 h-6 mb-2" />
        <span className="text-[7px] text-neutral-400 mb-0.5">Sign in at</span>
        <div className="bg-neutral-800 rounded px-2 py-0.5 mb-2">
          <span className="text-[8px] text-white font-medium">netflix.com/activate</span>
        </div>
        <span className="text-[7px] text-neutral-400 mb-1">and enter code</span>
        <div className="bg-neutral-800 border border-neutral-600 rounded-md px-3 py-1.5">
          <span className="text-[16px] font-bold tracking-[0.15em] text-white font-mono">
            WDJB-MJHT
          </span>
        </div>
      </div>
    )
  }

  // User is doing their thing on the phone — TV shows waiting
  if (
    flowStep === 'user_visits_url' ||
    flowStep === 'user_enters_code' ||
    flowStep === 'user_grants_consent'
  ) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center px-3 bg-[#141414]">
        <NetflixN className="w-5 h-5 mb-2 opacity-50" />
        <div className="bg-neutral-800 border border-neutral-600 rounded-md px-3 py-1.5 mb-3">
          <span className="text-[14px] font-bold tracking-[0.15em] text-white/50 font-mono">
            WDJB-MJHT
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 text-red-400 animate-spin" />
          <span className="text-[8px] text-neutral-400">Waiting for activation...</span>
        </div>
      </div>
    )
  }

  // Polling in progress
  if (flowStep === 'device_polls_pending') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center px-3 bg-[#141414]">
        <NetflixN className="w-5 h-5 mb-2 opacity-30" />
        <div className="bg-neutral-800 border border-neutral-600 rounded-md px-3 py-1.5 mb-3 opacity-30">
          <span className="text-[14px] font-bold tracking-[0.15em] text-white/40 font-mono">
            WDJB-MJHT
          </span>
        </div>
        <div className="flex items-center gap-1.5 mb-1">
          <Loader2 className="w-3 h-3 text-red-400 animate-spin" />
          <span className="text-[8px] text-neutral-400">Checking activation...</span>
        </div>
        <span className="text-[7px] text-neutral-600">
          Attempt #{pollCount + 1}
        </span>
      </div>
    )
  }

  // Poll succeeded
  if (flowStep === 'device_polls_success') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center px-3 bg-[#141414]">
        <NetflixN className="w-8 h-8 mb-2" />
        <CheckCircle2 className="w-5 h-5 text-green-400 mb-1" />
        <span className="text-[10px] text-green-400 font-semibold">Activated!</span>
        <span className="text-[7px] text-neutral-400 mt-0.5">Signing you in...</span>
      </div>
    )
  }

  // Authenticated — "Who's watching?" screen
  if (flowStep === 'device_authenticated') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center px-3 bg-[#141414]">
        <span className="text-[9px] text-neutral-300 mb-2">Who&apos;s watching?</span>
        <div className="flex gap-2">
          {[
            { name: 'Sarah', color: 'bg-blue-600' },
            { name: 'Kids', color: 'bg-yellow-500' },
            { name: 'Guest', color: 'bg-green-600' },
          ].map((p) => (
            <div key={p.name} className="flex flex-col items-center gap-0.5">
              <div className={cn('w-8 h-8 rounded-sm', p.color)} />
              <span className="text-[6px] text-neutral-400">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

/* ── Phone Screen Content ─────────────────────────────── */

function PhoneContent({ flowStep }: { flowStep: DeviceFlowStep }) {
  // Before user interaction starts
  if (
    flowStep === 'idle' ||
    flowStep === 'device_requests_code' ||
    flowStep === 'device_receives_code' ||
    flowStep === 'device_shows_code'
  ) {
    return null
  }

  // User visits netflix.com/activate — login page
  if (flowStep === 'user_visits_url') {
    return (
      <div className="w-full h-full flex flex-col bg-[#141414] px-2 pt-2">
        <div className="flex items-center gap-1.5 mb-3">
          <NetflixN className="w-4 h-4" />
          <span className="text-[8px] text-red-500 font-bold tracking-wide">NETFLIX</span>
        </div>
        <span className="text-[8px] text-white font-medium mb-2">Sign In</span>
        <div className="space-y-1.5">
          <div className="bg-[#333] border border-[#555] rounded px-1.5 py-1">
            <span className="text-[7px] text-neutral-300">sarah@gmail.com</span>
          </div>
          <div className="bg-[#333] border border-[#555] rounded px-1.5 py-1">
            <span className="text-[7px] text-neutral-500">••••••••</span>
          </div>
          <div className="bg-[#E50914] rounded py-1 text-center">
            <span className="text-[7px] text-white font-semibold">Sign In</span>
          </div>
        </div>
      </div>
    )
  }

  // User enters the activation code
  if (flowStep === 'user_enters_code') {
    return (
      <div className="w-full h-full flex flex-col bg-[#141414] px-2 pt-2">
        <div className="flex items-center gap-1.5 mb-2">
          <NetflixN className="w-4 h-4" />
          <span className="text-[8px] text-red-500 font-bold tracking-wide">NETFLIX</span>
        </div>
        <span className="text-[8px] text-white mb-1">Enter the code shown on your TV</span>
        <div className="space-y-2">
          <div className="bg-[#333] border-2 border-[#E50914] rounded-md px-2 py-1.5 text-center">
            <span className="text-[12px] font-mono font-bold tracking-[0.1em] text-white">
              WDJB-MJHT
            </span>
          </div>
          <div className="bg-[#E50914] rounded py-1 text-center">
            <span className="text-[7px] text-white font-semibold">Activate</span>
          </div>
        </div>
      </div>
    )
  }

  // Consent / confirmation screen
  if (flowStep === 'user_grants_consent') {
    return (
      <div className="w-full h-full flex flex-col bg-[#141414] px-2 pt-2">
        <div className="flex items-center gap-1.5 mb-2">
          <NetflixN className="w-4 h-4" />
          <span className="text-[8px] text-red-500 font-bold tracking-wide">NETFLIX</span>
        </div>
        <span className="text-[8px] text-white font-medium mb-1">
          Sign in to your TV?
        </span>
        <div className="space-y-1 mb-2">
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-red-500" />
            <span className="text-[7px] text-neutral-400">Access your profile</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-red-500" />
            <span className="text-[7px] text-neutral-400">Stream content</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-red-500" />
            <span className="text-[7px] text-neutral-400">Manage preferences</span>
          </div>
        </div>
        <div className="flex gap-1.5">
          <div className="flex-1 bg-[#333] rounded py-1 text-center">
            <span className="text-[7px] text-neutral-300">Cancel</span>
          </div>
          <div className="flex-1 bg-[#E50914] rounded py-1 text-center">
            <span className="text-[7px] text-white font-semibold">Allow</span>
          </div>
        </div>
      </div>
    )
  }

  // After consent — success
  if (
    flowStep === 'device_polls_pending' ||
    flowStep === 'device_polls_success' ||
    flowStep === 'device_authenticated'
  ) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#141414] px-3">
        <NetflixN className="w-6 h-6 mb-2" />
        <CheckCircle2 className="w-5 h-5 text-green-400 mb-1.5" />
        <span className="text-[9px] text-green-400 font-semibold mb-1">TV Activated!</span>
        <span className="text-[7px] text-neutral-400 text-center leading-relaxed">
          Your TV is now signed in. You can close this page.
        </span>
      </div>
    )
  }

  return null
}

/* ── Exported Composite Components ────────────────────── */

interface DeviceTVScreenProps {
  flowStep: DeviceFlowStep
  pollCount: number
  className?: string
}

export function DeviceTVScreen({ flowStep, pollCount, className }: DeviceTVScreenProps) {
  return (
    <div
      className={cn(
        'pointer-events-auto transition-all duration-500',
        flowStep === 'idle' ? 'opacity-40' : 'opacity-100',
        className,
      )}
    >
      <TVSimulator powered={flowStep !== 'idle'}>
        <TVContent flowStep={flowStep} pollCount={pollCount} />
      </TVSimulator>
    </div>
  )
}

interface UserPhoneScreenProps {
  flowStep: DeviceFlowStep
  className?: string
}

export function UserPhoneScreen({ flowStep, className }: UserPhoneScreenProps) {
  const showPhone =
    flowStep === 'user_visits_url' ||
    flowStep === 'user_enters_code' ||
    flowStep === 'user_grants_consent' ||
    flowStep === 'device_polls_pending' ||
    flowStep === 'device_polls_success' ||
    flowStep === 'device_authenticated'

  const urlBar =
    flowStep === 'user_visits_url' ||
    flowStep === 'user_enters_code' ||
    flowStep === 'user_grants_consent'
      ? 'netflix.com/activate'
      : flowStep === 'device_polls_pending' ||
          flowStep === 'device_polls_success' ||
          flowStep === 'device_authenticated'
        ? 'netflix.com/activate/success'
        : undefined

  return (
    <div
      className={cn(
        'pointer-events-auto transition-all duration-500',
        showPhone ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
        className,
      )}
    >
      <PhoneSimulator urlBar={urlBar}>
        <PhoneContent flowStep={flowStep} />
      </PhoneSimulator>
    </div>
  )
}
