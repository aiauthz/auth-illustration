import { useEffect, useState, useRef } from 'react'
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
 * EdgeLayer - renders arrows between nodes with manhattan routing
 * Uses direct coordinate reading from node refs
 */
export function EdgeLayer({ edges }: EdgeLayerProps) {
  const { nodeRefs } = useStage()
  const [paths, setPaths] = useState<Map<string, { path: string; labelPos: Point }>>(new Map())
  const animationFrameRef = useRef<number>()
  const [dashOffset, setDashOffset] = useState(0)
  const nodesDataRef = useRef<Map<string, NodeData>>(new Map())

  // Animate dash offset for pulsing edges
  useEffect(() => {
    const hasPulsing = edges.some((e) => e.pulse && e.visible !== false)
    if (hasPulsing) {
      const animate = () => {
        setDashOffset((prev) => (prev + 2) % 20)
        animationFrameRef.current = requestAnimationFrame(animate)
      }
      animationFrameRef.current = requestAnimationFrame(animate)
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      }
    }
  }, [edges])

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
      const newPaths = new Map<string, { path: string; labelPos: Point }>()

      edges.forEach((edge) => {
        // Default visible to true if not explicitly false
        if (edge.visible === false) return

        const fromData = nodesDataRef.current.get(edge.from)
        const toData = nodesDataRef.current.get(edge.to)

        if (!fromData || !toData) {
          // Nodes not ready yet
          return
        }

        // Calculate center points
        const fromCenter: Point = {
          x: fromData.x + fromData.w / 2,
          y: fromData.y + fromData.h / 2,
        }
        const toCenter: Point = {
          x: toData.x + toData.w / 2,
          y: toData.y + toData.h / 2,
        }

        // Choose anchor points based on direction
        const dx = toCenter.x - fromCenter.x
        const dy = toCenter.y - fromCenter.y

        let start: Point
        let end: Point

        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal dominant - use east/west anchors
          start = {
            x: fromCenter.x + (dx > 0 ? fromData.w / 2 : -fromData.w / 2),
            y: fromCenter.y,
          }
          end = {
            x: toCenter.x + (dx > 0 ? -toData.w / 2 : toData.w / 2),
            y: toCenter.y,
          }
        } else {
          // Vertical dominant - use north/south anchors
          start = {
            x: fromCenter.x,
            y: fromCenter.y + (dy > 0 ? fromData.h / 2 : -fromData.h / 2),
          }
          end = {
            x: toCenter.x,
            y: toCenter.y + (dy > 0 ? -toData.h / 2 : toData.h / 2),
          }
        }

        // Check if any intermediate nodes lie between from and to horizontally
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
          // Route above or below intermediate nodes to avoid crossing them
          const goingRight = dx > 0
          const padding = 30

          if (goingRight) {
            // Left-to-right: route above
            const topmost = Math.min(
              fromData.y,
              toData.y,
              ...intermediateNodes.map((n) => n.y),
            )
            const bypassY = topmost - padding
            // Exit from top of source, travel horizontally, enter from top of target
            const startAnchor: Point = { x: fromCenter.x, y: fromData.y }
            const endAnchor: Point = { x: toCenter.x, y: toData.y }
            path = `M ${startAnchor.x} ${startAnchor.y} L ${startAnchor.x} ${bypassY} L ${endAnchor.x} ${bypassY} L ${endAnchor.x} ${endAnchor.y}`
            labelPos = { x: midX, y: bypassY - 8 }
          } else {
            // Right-to-left: route below
            const bottommost = Math.max(
              fromData.y + fromData.h,
              toData.y + toData.h,
              ...intermediateNodes.map((n) => n.y + n.h),
            )
            const bypassY = bottommost + padding
            // Exit from bottom of source, travel horizontally, enter from bottom of target
            const startAnchor: Point = { x: fromCenter.x, y: fromData.y + fromData.h }
            const endAnchor: Point = { x: toCenter.x, y: toData.y + toData.h }
            path = `M ${startAnchor.x} ${startAnchor.y} L ${startAnchor.x} ${bypassY} L ${endAnchor.x} ${bypassY} L ${endAnchor.x} ${endAnchor.y}`
            labelPos = { x: midX, y: bypassY - 8 }
          }
        } else if (Math.abs(dx) > Math.abs(dy)) {
          // H-V path (no intermediate nodes)
          path = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`
          labelPos = { x: midX, y: midY - 8 }
        } else {
          // V-H path
          path = `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`
          labelPos = { x: midX, y: midY - 8 }
        }

        newPaths.set(edge.id, { path, labelPos })
      })

      setPaths(newPaths)
    }

    // Multiple attempts to ensure calculation happens after DOM is ready
    const timer1 = setTimeout(calculatePaths, 100)
    const timer2 = setTimeout(calculatePaths, 300)
    const timer3 = setTimeout(calculatePaths, 500)
    const timer4 = setTimeout(calculatePaths, 1000)

    const interval = setInterval(calculatePaths, 1000)

    window.addEventListener('resize', calculatePaths)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
      clearInterval(interval)
      window.removeEventListener('resize', calculatePaths)
    }
  }, [edges, nodeRefs])

  const visibleEdges = edges.filter((edge) => edge.visible !== false)

  return (
    <svg
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
              <polygon
                points="0 0, 10 5, 0 10"
                fill={arrowColor}
              />
            </marker>
          )
        })}
      </defs>
      {visibleEdges.map((edge) => {
        const pathData = paths.get(edge.id)
        if (!pathData) {
          // Render a placeholder if path not calculated yet
          return null
        }

        const strokeDasharray = edge.dashed ? '8,4' : 'none'
        const strokeDashoffset = edge.pulse ? dashOffset : 0
        const strokeColor = edge.color || 'rgba(255, 255, 255, 0.8)'

        return (
          <g key={edge.id}>
            <path
              d={pathData.path}
              stroke={strokeColor}
              strokeWidth="2"
              fill="none"
              markerEnd={`url(#arrowhead-${edge.id})`}
              strokeDasharray={strokeDasharray}
              style={{ strokeDashoffset }}
            />
            {edge.label && (
              <g>
                <rect
                  x={pathData.labelPos.x - Math.min(80, (edge.label.length * 5))}
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
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}