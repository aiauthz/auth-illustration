import type { HttpRequestEntry } from '@/components/HttpRequestPanel'
import type { InsightEntry } from '@/components/InsightsPanel'

/** Overlay types that can appear during a flow step */
export interface OverlayDef {
  type: 'login' | 'consent' | 'validation'
  /** For validation overlays: which node to attach to */
  nodeId?: string
  /** Position relative to node */
  position?: 'top' | 'right' | 'bottom' | 'left'
  /** Custom text for validation indicators */
  validatingText?: string
  validatedText?: string
  validatingSubtext?: string
  validatedSubtext?: string
  /** For consent dialogs */
  appName?: string
  scopes?: { key: string; description: string }[]
  variant?: 'default' | 'app-to-app'
}

/** Node definition for the stage */
export interface FlowNode {
  id: string
  x: number
  y: number
  w?: number
  h?: number
  roleLabel?: {
    text: string
    color: 'blue' | 'purple' | 'green' | 'orange'
  }
}

/** Edge definition for the stage */
export interface FlowEdge {
  id: string
  from: string
  to: string
  label?: string
  dashed?: boolean
  color?: string
}

/** A single step in a flow */
export interface FlowStepDef {
  id: string
  caption: string
  /** Edges visible at this step (shown one at a time, not accumulated) */
  edges: FlowEdge[]
  /** HTTP request entry to log at this step */
  httpEntry?: HttpRequestEntry
  /** Insights to display at this step */
  insights?: InsightEntry[]
  /** Overlays to show at this step */
  overlays?: OverlayDef[]
  /** Whether next step requires user interaction (blocks auto-advance) */
  blocksNext?: boolean
  /** Auto-advance delay in ms (for validation steps) */
  autoAdvanceMs?: number
}

/** Complete flow definition — pure data, no React */
export interface FlowDefinition {
  id: string
  name: string
  startLabel?: string
  actors: FlowNode[]
  steps: FlowStepDef[]
  /** Token generator functions keyed by name */
  tokenGenerators?: Record<string, () => string>
}

/** What the useFlow hook returns to any consumer */
export interface FlowState {
  /** Current step definition */
  currentStep: FlowStepDef | null
  /** Current step index (0-based, -1 for idle) */
  stepIndex: number
  /** Total number of steps */
  totalSteps: number
  /** Step number for display (1-based) */
  stepNumber: number
  /** Current caption */
  caption: string | null
  /** All actors */
  actors: FlowNode[]
  /** Edges visible at the current step */
  visibleEdges: FlowEdge[]
  /** Accumulated HTTP entries up to current step */
  httpEntries: HttpRequestEntry[]
  /** Insights for current step */
  activeInsights: InsightEntry[]
  /** Overlays for current step */
  activeOverlays: OverlayDef[]
  /** Current step ID */
  flowStepId: string
  /** Whether the flow is idle */
  isIdle: boolean
  /** Whether we can advance */
  canGoNext: boolean
  /** Whether we can go back */
  canGoPrevious: boolean
  /** Flow definition metadata */
  flow: FlowDefinition
}

/** Controls returned by useFlow */
export interface FlowControls {
  start: () => void
  next: () => void
  previous: () => void
  reset: () => void
  goToStep: (index: number) => void
  /** Called when a blocking overlay completes (login/consent) */
  unblock: () => void
}
