import { useEffect, useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useStage } from './Stage'

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

interface EdgeLayerProps {
  edges: Edge[]
}

interface Point {
  x: number
  y: number
}

interface NodeData {
  x: number
  y: number
  w: number
  h: number
}

/**
 * EdgeLayer - renders animated arrows between nodes with manhattan routing.
 * Uses motion for smooth edge enter/exit and animated dashes.
 */
export function EdgeLayer({ edges }: EdgeLayerProps) {
  const { nodeRefs } = useStage()
  const [paths, setPaths] = useState<Map<string, { path: string; labelPos: Point; pathLength: number }>>(new Map())
  const nodesDataRef = useRef<Map<string, NodeData>>(new Map())
  const svgRef = useRef<SVGSVGElement>(null)

  // Update node positions from refs
  useEffect(() => {
    const updateNodePositions = () => {
      const newNodesData = new Map<string, NodeData>()

      nodeRefs.forEach((ref, nodeId) => {
        if (!ref?.current) return

        const el = ref.current
        const leftStr = el.style.left || ''
        const topStr = el.style.top || ''

        const x = parseFloat(leftStr.replace('px', '').replace(/[^\d.]/g, '')) || 0
        const y = parseFloat(topStr.replace('px', '').replace(/[^\d.]/g, '')) || 0
        const w = el.offsetWidth || 220
        const h = el.offsetHeight || 120

        if (x >= 0 && y >= 0) {
          newNodesData.set(nodeId, { x, y, w, h })
        }
      })

      nodesDataRef.current = newNodesData
    }

    updateNodePositions()
    const interval = setInterval(updateNodePositions, 200)

    return () => clearInterval(interval)
  }, [nodeRefs])

  // Recalculate paths when nodes or edges change
  useEffect(() => {
    const calculatePaths = () => {
      const newPaths = new Map<string, { path: string; labelPos: Point; pathLength: number }>()

      edges.forEach((edge) => {
        if (edge.visible === false) return

        const fromData = nodesDataRef.current.get(edge.from)
        const toData = nodesDataRef.current.get(edge.to)

        if (!fromData || !toData) return

        const fromCenter: Point = {
          x: fromData.x + fromData.w / 2,
          y: fromData.y + fromData.h / 2,
        }
        const toCenter: Point = {
          x: toData.x + toData.w / 2,
          y: toData.y + toData.h / 2,
        }

        const dx = toCenter.x - fromCenter.x
        const dy = toCenter.y - fromCenter.y

        let start: Point
        let end: Point

        if (Math.abs(dx) > Math.abs(dy)) {
          start = {
            x: fromCenter.x + (dx > 0 ? fromData.w / 2 : -fromData.w / 2),
            y: fromCenter.y,
          }
          end = {
            x: toCenter.x + (dx > 0 ? -toData.w / 2 : toData.w / 2),
            y: toCenter.y,
          }
        } else {
          start = {
            x: fromCenter.x,
            y: fromCenter.y + (dy > 0 ? fromData.h / 2 : -fromData.h / 2),
          }
          end = {
            x: toCenter.x,
            y: toCenter.y + (dy > 0 ? -toData.h / 2 : toData.h / 2),
          }
        }

        // Check for intermediate nodes
        const minX = Math.min(fromCenter.x, toCenter.x)
        const maxX = Math.max(fromCenter.x, toCenter.x)
        const intermediateNodes: NodeData[] = []

        if (Math.abs(dx) > Math.abs(dy)) {
          nodesDataRef.current.forEach((nodeData, nodeId) => {
            if (nodeId === edge.from || nodeId === edge.to) return
            const nodeCx = nodeData.x + nodeData.w / 2
            if (nodeCx > minX && nodeCx < maxX) {
              intermediateNodes.push(nodeData)
            }
          })
        }

        const midX = (start.x + end.x) / 2
        const midY = (start.y + end.y) / 2

        let path: string
        let labelPos: Point

        if (intermediateNodes.length > 0) {
          const goingRight = dx > 0
          const padding = 30

          if (goingRight) {
            const topmost = Math.min(fromData.y, toData.y, ...intermediateNodes.map((n) => n.y))
            const bypassY = topmost - padding
            const startAnchor: Point = { x: fromCenter.x, y: fromData.y }
            const endAnchor: Point = { x: toCenter.x, y: toData.y }
            path = `M ${startAnchor.x} ${startAnchor.y} L ${startAnchor.x} ${bypassY} L ${endAnchor.x} ${bypassY} L ${endAnchor.x} ${endAnchor.y}`
            labelPos = { x: midX, y: bypassY - 8 }
          } else {
            const bottommost = Math.max(
              fromData.y + fromData.h,
              toData.y + toData.h,
              ...intermediateNodes.map((n) => n.y + n.h),
            )
            const bypassY = bottommost + padding
            const startAnchor: Point = { x: fromCenter.x, y: fromData.y + fromData.h }
            const endAnchor: Point = { x: toCenter.x, y: toData.y + toData.h }
            path = `M ${startAnchor.x} ${startAnchor.y} L ${startAnchor.x} ${bypassY} L ${endAnchor.x} ${bypassY} L ${endAnchor.x} ${endAnchor.y}`
            labelPos = { x: midX, y: bypassY - 8 }
          }
        } else if (Math.abs(dx) > Math.abs(dy)) {
          path = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`
          labelPos = { x: midX, y: midY - 8 }
        } else {
          path = `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`
          labelPos = { x: midX, y: midY - 8 }
        }

        // Estimate path length for draw animation
        const pathLength = Math.abs(end.x - start.x) + Math.abs(end.y - start.y) + 100

        newPaths.set(edge.id, { path, labelPos, pathLength })
      })

      setPaths(newPaths)
    }

    // Fewer retries needed — ResizeObserver handles layout shifts
    const timer1 = setTimeout(calculatePaths, 100)
    const timer2 = setTimeout(calculatePaths, 500)

    window.addEventListener('resize', calculatePaths)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      window.removeEventListener('resize', calculatePaths)
    }
  }, [edges, nodeRefs])

  const visibleEdges = useMemo(
    () => edges.filter((edge) => edge.visible !== false),
    [edges],
  )

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none z-10"
      width="1280"
      height="720"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {visibleEdges.map((edge) => {
          const arrowColor = edge.color || 'rgba(255, 255, 255, 0.8)'
          return (
            <marker
              key={`arrow-${edge.id}`}
              id={`arrowhead-${edge.id}`}
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="0 0, 10 5, 0 10" fill={arrowColor} />
            </marker>
          )
        })}
      </defs>

      <AnimatePresence>
        {visibleEdges.map((edge) => {
          const pathData = paths.get(edge.id)
          if (!pathData) return null

          const strokeColor = edge.color || 'rgba(255, 255, 255, 0.8)'

          return (
            <motion.g
              key={edge.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Glow layer underneath */}
              {edge.pulse && (
                <motion.path
                  d={pathData.path}
                  stroke={strokeColor}
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.15, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ filter: 'blur(4px)' }}
                />
              )}

              {/* Main path with draw animation */}
              <motion.path
                d={pathData.path}
                stroke={strokeColor}
                strokeWidth="2"
                fill="none"
                markerEnd={`url(#arrowhead-${edge.id})`}
                strokeDasharray={edge.dashed ? '8,4' : undefined}
                initial={{
                  pathLength: 0,
                  opacity: 0,
                }}
                animate={{
                  pathLength: 1,
                  opacity: 1,
                }}
                transition={{
                  pathLength: { duration: 0.6, ease: 'easeInOut' },
                  opacity: { duration: 0.2 },
                }}
              />

              {/* Animated flow dot for pulsing edges */}
              {edge.pulse && (
                <motion.circle
                  r="3"
                  fill={strokeColor}
                  initial={{ offsetDistance: '0%' }}
                  animate={{ offsetDistance: '100%' }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  style={{
                    offsetPath: `path("${pathData.path}")`,
                    filter: `drop-shadow(0 0 4px ${strokeColor})`,
                  }}
                />
              )}

              {/* Label */}
              {edge.label && (
                <motion.g
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  <rect
                    x={pathData.labelPos.x - Math.min(80, edge.label.length * 5)}
                    y={pathData.labelPos.y - 10}
                    width={Math.min(160, edge.label.length * 10)}
                    height="18"
                    rx="4"
                    fill="#171717"
                    stroke={strokeColor}
                    strokeWidth="1"
                  />
                  <text
                    x={pathData.labelPos.x}
                    y={pathData.labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-neutral-300"
                    style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif' }}
                  >
                    {edge.label}
                  </text>
                </motion.g>
              )}
            </motion.g>
          )
        })}
      </AnimatePresence>
    </svg>
  )
}
