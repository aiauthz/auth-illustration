interface NodeSize {
  id: string
  w: number
}

interface NodePosition {
  id: string
  x: number
  y: number
  w: number
}

/**
 * Arrange nodes in a horizontal row, centered vertically.
 * Returns positions suitable for Stage node arrays.
 */
export function row(
  ids: NodeSize[],
  options?: { y?: number; gap?: number; startX?: number }
): NodePosition[] {
  const { y = 280, gap = 30, startX = 100 } = options ?? {}
  let x = startX
  return ids.map((node) => {
    const pos = { id: node.id, x, y, w: node.w }
    x += node.w + gap
    return pos
  })
}

/**
 * Arrange nodes in a grid (rows x cols).
 * Each inner array is one row of nodes laid out left-to-right.
 */
export function grid(
  rows: NodeSize[][],
  options?: { startX?: number; startY?: number; gapX?: number; gapY?: number }
): NodePosition[] {
  const { startX = 64, startY = 180, gapX = 30, gapY = 30 } = options ?? {}
  const result: NodePosition[] = []
  let y = startY
  for (const rowNodes of rows) {
    let x = startX
    let maxH = 0
    for (const node of rowNodes) {
      result.push({ id: node.id, x, y, w: node.w })
      x += node.w + gapX
      // Assume a standard card height of ~120px for row spacing
      maxH = Math.max(maxH, 120)
    }
    y += maxH + gapY
  }
  return result
}
