import { useState, useMemo, useCallback, useEffect } from 'react'
import type { FlowDefinition, FlowState, FlowControls, FlowEdge } from './types'
import type { HttpRequestEntry } from '@/components/HttpRequestPanel'
import type { InsightEntry } from '@/components/InsightsPanel'

/**
 * Core flow engine hook.
 * Accepts a FlowDefinition (pure data) and returns FlowState + FlowControls.
 * Works for both presentation mode and playground mode.
 */
export function useFlow(definition: FlowDefinition): [FlowState, FlowControls] {
  const [stepIndex, setStepIndex] = useState(-1) // -1 = idle
  const [blocked, setBlocked] = useState(false)

  const steps = definition.steps
  const currentStep = stepIndex >= 0 && stepIndex < steps.length ? steps[stepIndex] : null

  // Auto-advance for steps with autoAdvanceMs
  useEffect(() => {
    if (!currentStep?.autoAdvanceMs) return
    const timer = setTimeout(() => {
      setBlocked(false)
      if (stepIndex < steps.length - 1) {
        setStepIndex(stepIndex + 1)
      }
    }, currentStep.autoAdvanceMs)
    return () => clearTimeout(timer)
  }, [stepIndex, currentStep, steps.length])

  // Accumulated edges: only show current step's edges
  const visibleEdges = useMemo<FlowEdge[]>(() => {
    if (!currentStep) return []
    return currentStep.edges.map((edge) => ({
      ...edge,
      visible: true,
      pulse: true,
    }))
  }, [currentStep])

  // Accumulated HTTP entries up to current step
  const httpEntries = useMemo<HttpRequestEntry[]>(() => {
    const entries: HttpRequestEntry[] = []
    for (let i = 0; i <= stepIndex && i < steps.length; i++) {
      const step = steps[i]
      if (step.httpEntry) {
        entries.push(step.httpEntry)
      }
    }
    return entries
  }, [stepIndex, steps])

  // Active insights for current step
  const activeInsights = useMemo<InsightEntry[]>(() => {
    if (!currentStep?.insights) return []
    return currentStep.insights
  }, [currentStep])

  // Active overlays for current step
  const activeOverlays = useMemo(() => {
    if (!currentStep?.overlays) return []
    return currentStep.overlays
  }, [currentStep])

  const isIdle = stepIndex < 0
  const isLastStep = stepIndex >= steps.length - 1
  const canGoNext = !isIdle && !isLastStep && !blocked
  const canGoPrevious = stepIndex > 0

  const state: FlowState = {
    currentStep,
    stepIndex,
    totalSteps: steps.length,
    stepNumber: stepIndex + 1,
    caption: currentStep ? currentStep.caption : null,
    actors: definition.actors,
    visibleEdges,
    httpEntries,
    activeInsights,
    activeOverlays,
    flowStepId: currentStep?.id ?? 'idle',
    isIdle,
    canGoNext,
    canGoPrevious,
    flow: definition,
  }

  const start = useCallback(() => {
    setStepIndex(0)
    setBlocked(!!steps[0]?.blocksNext)
  }, [steps])

  const next = useCallback(() => {
    if (stepIndex < steps.length - 1 && !blocked) {
      const nextIdx = stepIndex + 1
      setStepIndex(nextIdx)
      setBlocked(!!steps[nextIdx]?.blocksNext)
    }
  }, [stepIndex, steps, blocked])

  const previous = useCallback(() => {
    if (stepIndex > 0) {
      const prevIdx = stepIndex - 1
      setStepIndex(prevIdx)
      setBlocked(!!steps[prevIdx]?.blocksNext)
    }
  }, [stepIndex, steps])

  const reset = useCallback(() => {
    setStepIndex(-1)
    setBlocked(false)
  }, [])

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < steps.length) {
        setStepIndex(index)
        setBlocked(!!steps[index]?.blocksNext)
      }
    },
    [steps],
  )

  const unblock = useCallback(() => {
    setBlocked(false)
  }, [])

  const controls: FlowControls = { start, next, previous, reset, goToStep, unblock }

  return [state, controls]
}
