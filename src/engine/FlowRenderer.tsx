import { useState, useEffect } from 'react'
import { Stage } from '@/stage/Stage'
import { SlideLayout } from '@/components/SlideLayout'
import { HttpTerminalDrawer } from '@/components/HttpTerminalDrawer'
import { InsightsPanel } from '@/components/InsightsPanel'
import { ValidationIndicatorPositioned } from '@/components/ValidationIndicatorPositioned'
import { LoginDialog } from '@/components/LoginDialog'
import { ConsentDialog } from '@/components/ConsentDialog'
import type { FlowState, FlowControls } from './types'

interface FlowRendererProps {
  state: FlowState
  controls: FlowControls
}

/**
 * Shared rendering component for flow visualizations.
 * Consumes FlowState + FlowControls from useFlow() and renders
 * Stage, SlideLayout, HttpTerminalDrawer, InsightsPanel, and overlays.
 *
 * Works identically for presentation mode and playground mode —
 * the difference is how FlowState is produced.
 */
export function FlowRenderer({ state, controls }: FlowRendererProps) {
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [showConsentDialog, setShowConsentDialog] = useState(false)
  const [validationStates, setValidationStates] = useState<Record<string, boolean>>({})

  // Handle overlay state changes when step changes
  useEffect(() => {
    const hasLogin = state.activeOverlays.some((o) => o.type === 'login')
    const hasConsent = state.activeOverlays.some((o) => o.type === 'consent')

    setShowLoginDialog(hasLogin)
    setShowConsentDialog(hasConsent)

    // Reset validation states for validation overlays
    const validations = state.activeOverlays.filter((o) => o.type === 'validation')
    if (validations.length > 0) {
      const newStates: Record<string, boolean> = {}
      validations.forEach((v) => {
        if (v.nodeId) newStates[v.nodeId] = false
      })
      setValidationStates(newStates)
    }
  }, [state.flowStepId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-complete validation indicators
  useEffect(() => {
    const validations = state.activeOverlays.filter((o) => o.type === 'validation')
    const timers: ReturnType<typeof setTimeout>[] = []

    validations.forEach((v) => {
      if (v.nodeId && !validationStates[v.nodeId]) {
        const timer = setTimeout(() => {
          setValidationStates((prev) => ({ ...prev, [v.nodeId!]: true }))
        }, 1500)
        timers.push(timer)
      }
    })

    return () => timers.forEach(clearTimeout)
  }, [state.activeOverlays, validationStates])

  const handleLogin = (_username: string, _password: string) => {
    setShowLoginDialog(false)
    controls.unblock()
    controls.next()
  }

  const handleConsent = () => {
    setShowConsentDialog(false)
    controls.unblock()
    controls.next()
  }

  const handleConsentDeny = () => {
    setShowConsentDialog(false)
    controls.reset()
  }

  // Build stepMetadata from flow definition
  const stepMetadata: Record<string, { number: number; caption: string } | null> = { idle: null }
  state.flow.steps.forEach((step, i) => {
    stepMetadata[step.id] = { number: i + 1, caption: step.caption }
  })

  // Build edges with visibility/pulse for Stage
  const stageEdges = state.visibleEdges.map((edge) => ({
    ...edge,
    visible: true,
    pulse: true,
  }))

  // Get consent overlay config
  const consentOverlay = state.activeOverlays.find((o) => o.type === 'consent')

  return (
    <SlideLayout
      title={state.flow.name}
      flowStep={state.flowStepId}
      stepMetadata={stepMetadata}
      onStart={controls.start}
      onNext={controls.next}
      onPrevious={controls.previous}
      onReset={controls.reset}
      canGoNext={state.canGoNext}
      canGoPrevious={state.canGoPrevious}
      startLabel={state.flow.startLabel ?? 'Start Flow'}
    >
      <div className="w-full h-full">
        <Stage nodes={state.actors} edges={stageEdges} className="w-full h-full">
          {/* Validation overlays */}
          {state.activeOverlays
            .filter((o) => o.type === 'validation' && o.nodeId)
            .map((overlay) => (
              <ValidationIndicatorPositioned
                key={overlay.nodeId}
                isValidated={validationStates[overlay.nodeId!] ?? false}
                nodeId={overlay.nodeId!}
                position={overlay.position}
                validatingText={overlay.validatingText}
                validatedText={overlay.validatedText}
                validatingSubtext={overlay.validatingSubtext}
                validatedSubtext={overlay.validatedSubtext}
              />
            ))}
        </Stage>
      </div>

      <HttpTerminalDrawer entries={state.httpEntries} activeStepId={state.flowStepId} />

      <InsightsPanel entries={state.activeInsights} activeStepId={state.flowStepId} />

      <LoginDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        onLogin={handleLogin}
      />

      <ConsentDialog
        open={showConsentDialog}
        onOpenChange={setShowConsentDialog}
        appName={consentOverlay?.appName ?? 'Application'}
        scopes={consentOverlay?.scopes ?? []}
        onAllow={handleConsent}
        onDeny={handleConsentDeny}
        variant={consentOverlay?.variant}
      />
    </SlideLayout>
  )
}
