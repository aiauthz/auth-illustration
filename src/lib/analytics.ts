declare global {
  interface Window {
    gtag?: (command: 'event', name: string, params?: Record<string, unknown>) => void
  }
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  window.gtag?.('event', name, params)
}

export const analytics = {
  flowView: (slug: string) => trackEvent('flow_view', { flow_slug: slug }),
  flowStep: (slug: string, step: number) =>
    trackEvent('flow_step', { flow_slug: slug, step_index: step }),
  playgroundStepComplete: (flowType: string, step: string) =>
    trackEvent('playground_step', { flow_type: flowType, step }),
  playgroundFlowComplete: (flowType: string) =>
    trackEvent('playground_complete', { flow_type: flowType }),
}
