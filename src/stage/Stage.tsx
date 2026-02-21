import { createContext, useContext, useRef, useState, useEffect, ReactNode, RefObject } from 'react'
import { GridLayer } from './GridLayer'
import { NodeLayer } from './NodeLayer'
import { EdgeLayer } from './EdgeLayer'

interface Node {
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

interface Edge {
  id: string
  from: string
  to: string
  label?: string
  dashed?: boolean
  pulse?: boolean
  visible?: boolean
  color?: string
}

interface StageContextValue {
  nodeRefs: Map<string, RefObject<HTMLDivElement>>
  registerNode: (id: string, ref: RefObject<HTMLDivElement>) => void
  scale: number
  containerRef: RefObject<HTMLDivElement>
}

const StageContext = createContext<StageContextValue | null>(null)

export function useStage() {
  const context = useContext(StageContext)
  if (!context) {
    throw new Error('useStage must be used within Stage')
  }
  return context
}

interface StageProps {
  nodes: Node[]
  edges: Edge[]
  children?: ReactNode
  className?: string
}

/**
 * Stage component - full-screen grid-based actor placement
 * Handles responsive scaling and provides context for node anchors
 */
export function Stage({ nodes, edges, children, className }: StageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Map<string, RefObject<HTMLDivElement>>>(new Map())
  const [scale, setScale] = useState(1)

  // Register node ref
  const registerNode = (id: string, ref: RefObject<HTMLDivElement>) => {
    if (ref) {
      nodeRefs.current.set(id, ref)
    }
  }

  // Calculate scale to fit 16:9 content in full screen
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) {
        setTimeout(updateScale, 100)
        return
      }

      const container = containerRef.current
      const containerWidth = container.clientWidth || container.offsetWidth
      const containerHeight = container.clientHeight || container.offsetHeight

      if (!containerWidth || !containerHeight) {
        setTimeout(updateScale, 100)
        return
      }

      const targetAspectRatio = 1280 / 720
      const containerAspectRatio = containerWidth / containerHeight

      let newScale: number
      if (containerAspectRatio > targetAspectRatio) {
        // Container is wider - fit by height
        newScale = containerHeight / 720
      } else {
        // Container is taller - fit by width
        newScale = containerWidth / 1280
      }

      // Use most of the screen but leave some padding
      newScale *= 0.95

      if (newScale > 0) {
        setScale(newScale)
      }
    }

    const timer = setTimeout(updateScale, 50)
    window.addEventListener('resize', updateScale)

    if (containerRef.current) {
      const resizeObserver = new ResizeObserver(updateScale)
      resizeObserver.observe(containerRef.current)
      
      return () => {
        clearTimeout(timer)
        resizeObserver.disconnect()
        window.removeEventListener('resize', updateScale)
      }
    }

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateScale)
    }
  }, [])

  const contextValue: StageContextValue = {
    nodeRefs: nodeRefs.current,
    registerNode,
    scale,
    containerRef,
  }

  return (
    <StageContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={`relative w-full h-full flex items-center justify-center ${className || ''}`}
        style={{
          backgroundColor: '#0a0a0a',
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.02) 0%, transparent 70%)',
        }}
      >
        <div
          className="relative"
          style={{
            transform: `scale(${scale})`,
            width: '1280px',
            height: '720px',
          }}
        >
          <GridLayer />
          <NodeLayer nodes={nodes} />
          <EdgeLayer edges={edges} />
          {/* Children positioned within the scaled 1280×720 canvas */}
          <div className="absolute inset-0 z-40 pointer-events-none">
            {children}
          </div>
        </div>
      </div>
    </StageContext.Provider>
  )
}