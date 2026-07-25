import { useMemo, useRef, useState, useLayoutEffect } from 'react'
import { sankey, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey'
import { motion, AnimatePresence } from 'framer-motion'
import { colorForRole } from '../lib/palette.js'
import { formatCompact, formatPct } from '../lib/format.js'

const NODE_WIDTH = 14
const NODE_PADDING = 14
const MARGIN = { top: 10, right: 10, bottom: 10, left: 10 }

const EASE = [0.4, 0, 0.2, 1]
const MORPH = { duration: 0.55, ease: EASE }

// Observe the container's size so the chart always fills it (width AND height).
function useContainerSize() {
  const ref = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setSize({ width, height })
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, size]
}

export default function SankeyChart({
  graph,
  mode,
  selectedKey,
  onSelectNode,
  onSelectLink,
  onHover,
  onBackgroundClick,
}) {
  const [containerRef, { width, height }] = useContainerSize()
  const [hoverKey, setHoverKey] = useState(null)

  const layout = useMemo(() => {
    if (!width || !height || graph.nodes.length === 0) return null
    const sankeyGen = sankey()
      .nodeId((d) => d.id)
      .nodeWidth(NODE_WIDTH)
      .nodePadding(Math.max(8, Math.min(NODE_PADDING, height / graph.nodes.length)))
      .nodeAlign(sankeyJustify)
      .extent([
        [MARGIN.left, MARGIN.top],
        [width - MARGIN.right, height - MARGIN.bottom],
      ])
    // d3-sankey mutates its inputs, so hand it fresh copies.
    try {
      return sankeyGen({
        nodes: graph.nodes.map((n) => ({ ...n })),
        links: graph.links.map((l) => ({ ...l })),
      })
    } catch (e) {
      console.error('Sankey layout failed', e)
      return null
    }
  }, [graph, width, height])

  const active = hoverKey || selectedKey

  const linkKey = (l) => `link:${l.source.id}->${l.target.id}`

  const isLinkActive = (l) => {
    if (!active) return false
    if (active === linkKey(l)) return true
    if (active.startsWith('node:')) {
      const id = active.slice(5)
      return l.source.id === id || l.target.id === id
    }
    return false
  }

  const isNodeActive = (n, links) => {
    if (!active) return false
    if (active === `node:${n.id}`) return true
    if (active.startsWith('link:')) {
      const [s, t] = active.slice(5).split('->')
      return n.id === s || n.id === t
    }
    const id = active.slice(5)
    return links.some(
      (l) =>
        (l.source.id === id && l.target.id === n.id) ||
        (l.target.id === id && l.source.id === n.id)
    )
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      {layout && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Sankey diagram of the Pakistan federal budget 2026-27"
          className="block"
          onClick={(e) => {
            if (e.target.tagName === 'svg') onBackgroundClick?.()
          }}
        >
          {/* ---- Links ---- */}
          <g fill="none">
            <AnimatePresence>
              {layout.links.map((l) => {
                const on = isLinkActive(l)
                const dim = active && !on
                const key = linkKey(l)
                const hoverPayload = (e) => ({
                  kind: 'link',
                  label: `${l.source.label} → ${l.target.label}`,
                  value: l.value,
                  pct: l.pct,
                  pctShort: l.pctShort,
                  x: e.clientX,
                  y: e.clientY,
                })
                const d = sankeyLinkHorizontal()(l)
                return (
                  <motion.path
                    key={key}
                    initial={{ opacity: 0, d, strokeWidth: Math.max(1, l.width) }}
                    animate={{
                      d,
                      strokeWidth: Math.max(1, l.width),
                      opacity: on ? 0.62 : dim ? 0.12 : 0.34,
                    }}
                    exit={{ opacity: 0 }}
                    transition={MORPH}
                    stroke={colorForRole(l.role, mode)}
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      setHoverKey(key)
                      onHover?.(hoverPayload(e))
                    }}
                    onMouseMove={(e) => onHover?.(hoverPayload(e))}
                    onMouseLeave={() => {
                      setHoverKey(null)
                      onHover?.(null)
                    }}
                    onClick={() => onSelectLink?.(l)}
                  />
                )
              })}
            </AnimatePresence>
          </g>

          {/* ---- Nodes ---- */}
          <AnimatePresence>
            {layout.nodes.map((n) => {
              const color = colorForRole(n.side, mode)
              const nodeHeight = Math.max(1.5, n.y1 - n.y0)
              const labelRight = n.x0 < width / 2
              const selected = active === `node:${n.id}`
              const on = isNodeActive(n, layout.links)
              const dim = active && !on && !selected
              const showValue = nodeHeight > 26
              const showLabel = nodeHeight > 9
              const showPct = n.side === 'expenditure' || n.side === 'transfer'
              const key = `node:${n.id}`
              const hoverPayload = (e) => ({
                kind: 'node',
                label: n.label,
                value: n.value,
                pct: n.pct,
                pctShort: n.pctShort,
                hasChildren: n.hasChildren,
                expanded: n.expanded,
                x: e.clientX,
                y: e.clientY,
              })
              return (
                <motion.g
                  key={key}
                  initial={{ opacity: 0, x: n.x0, y: n.y0 }}
                  animate={{ opacity: dim ? 0.25 : 1, x: n.x0, y: n.y0 }}
                  exit={{ opacity: 0 }}
                  transition={MORPH}
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    setHoverKey(key)
                    onHover?.(hoverPayload(e))
                  }}
                  onMouseMove={(e) => onHover?.(hoverPayload(e))}
                  onMouseLeave={() => {
                    setHoverKey(null)
                    onHover?.(null)
                  }}
                  onClick={() => onSelectNode?.(n)}
                >
                  <motion.rect
                    initial={{ width: n.x1 - n.x0, height: nodeHeight }}
                    animate={{ width: n.x1 - n.x0, height: nodeHeight }}
                    transition={MORPH}
                    fill={color}
                    rx={3}
                    stroke={selected ? 'hsl(var(--foreground))' : 'none'}
                    strokeWidth={selected ? 1.5 : 0}
                  />
                  {showLabel && (
                    <motion.g
                      initial={{ x: labelRight ? n.x1 - n.x0 + 8 : -8, y: nodeHeight / 2 }}
                      animate={{
                        x: labelRight ? n.x1 - n.x0 + 8 : -8,
                        y: nodeHeight / 2,
                      }}
                      transition={MORPH}
                    >
                      <text
                        dy={showValue ? '-0.15em' : '0.32em'}
                        textAnchor={labelRight ? 'start' : 'end'}
                        className="node-label"
                      >
                        {n.hasChildren ? (n.expanded ? '▾ ' : '▸ ') : ''}
                        {n.label}
                      </text>
                      {showValue && (
                        <text dy="1.05em" textAnchor={labelRight ? 'start' : 'end'} className="node-value">
                          {formatCompact(n.value)}
                          {showPct ? ` · ${formatPct(n.pct)}` : ''}
                        </text>
                      )}
                    </motion.g>
                  )}
                </motion.g>
              )
            })}
          </AnimatePresence>
        </svg>
      )}
    </div>
  )
}
