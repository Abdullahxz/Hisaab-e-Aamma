import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import SankeyChart from './components/SankeyChart.jsx'
import DetailSheet from './components/DetailSheet.jsx'
import Breadcrumb from './components/Breadcrumb.jsx'
import TopBar from './components/TopBar.jsx'
import ChartTooltip from './components/ChartTooltip.jsx'
import MinistriesPage from './components/MinistriesPage.jsx'
import MinistryPage from './components/MinistryPage.jsx'
import { buildGraph } from './lib/buildGraph.js'
import { validateData } from './lib/validateData.js'

const BASE = import.meta.env.BASE_URL

function initialMode() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

// Tiny hash router: '#/'-> flow, '#/ministries' -> list, '#/ministry/<slug>' -> detail.
function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '')
  if (h === 'ministries') return { page: 'ministries' }
  const m = h.match(/^ministry\/(.+)$/)
  if (m) return { page: 'ministry', slug: decodeURIComponent(m[1]) }
  return { page: 'flow' }
}

function useHashRoute() {
  const [route, setRoute] = useState(parseHash)
  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const navigate = useCallback((hash) => {
    window.location.hash = hash
  }, [])
  return [route, navigate]
}

export default function App() {
  const [data, setData] = useState(null)
  const [mdata, setMdata] = useState(null)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState(initialMode)
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [hover, setHover] = useState(null)
  const chartContainerRef = useRef(null)
  const [route, navigate] = useHashRoute()

  // Load and validate the data once.
  useEffect(() => {
    fetch(`${BASE}data/budget.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load data (${r.status})`)
        return r.json()
      })
      .then((d) => {
        validateData(d)
        setData(d)
      })
      .catch((e) => setError(e.message))
    fetch(`${BASE}data/ministries.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setMdata)
      .catch(() => setMdata(null))
  }, [])

  // Apply theme to the document root for CSS variables + Tailwind dark mode.
  useEffect(() => {
    document.documentElement.dataset.theme = mode
  }, [mode])

  const graph = useMemo(() => (data ? buildGraph(data, expandedIds) : null), [data, expandedIds])

  // Descendant ids of a node (for collapsing a whole subtree).
  const descendantsOf = useCallback(
    (id) => {
      if (!data) return []
      const out = []
      const walk = (pid) => {
        for (const n of data.nodes) {
          if (n.parent === pid) {
            out.push(n.id)
            walk(n.id)
          }
        }
      }
      walk(id)
      return out
    },
    [data]
  )

  const expand = useCallback((id) => {
    setExpandedIds((prev) => new Set(prev).add(id))
  }, [])

  const collapse = useCallback(
    (id) => {
      setExpandedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        for (const d of descendantsOf(id)) next.delete(d)
        return next
      })
    },
    [descendantsOf]
  )

  const toggleExpand = useCallback(
    (id) => {
      if (expandedIds.has(id)) collapse(id)
      else expand(id)
    },
    [expandedIds, expand, collapse]
  )

  // Clicking a chart node: open its sheet, and drill in if it has hidden children.
  const handleNodeClick = useCallback(
    (node) => {
      setSelectedNodeId(node.id)
      if (node.hasChildren && !expandedIds.has(node.id)) expand(node.id)
    },
    [expandedIds, expand]
  )

  // Selecting from the breakdown list inside the sheet.
  const handleSelectById = useCallback(
    (id) => {
      setSelectedNodeId(id)
      const hasChildren = data?.nodes.some((n) => n.parent === id)
      if (hasChildren && !expandedIds.has(id)) expand(id)
    },
    [data, expandedIds, expand]
  )

  // A flow carries the full story of exactly one node: for parent<->child flows
  // that is the child; for backbone flows it is the informative (non-pass-through)
  // endpoint. Clicking a flow opens that node's sheet — a flow click is never a
  // dead end.
  const handleLinkClick = useCallback(
    (link) => {
      const src = data?.nodes.find((n) => n.id === link.source.id)
      const tgt = data?.nodes.find((n) => n.id === link.target.id)
      let subjectId
      if (src && tgt && src.parent === tgt.id) subjectId = src.id
      else if (src && tgt && tgt.parent === src.id) subjectId = tgt.id
      else {
        const PASS_THROUGH = new Set(['gross_revenue', 'total_resources'])
        subjectId =
          [link.source.id, link.target.id].find((id) => !PASS_THROUGH.has(id)) ?? link.source.id
      }
      handleSelectById(subjectId)
    },
    [data, handleSelectById]
  )

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  const reset = useCallback(() => {
    setExpandedIds(new Set())
    clearSelection()
  }, [clearSelection])

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-lg font-semibold">Could not load the budget data</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!data || !graph) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading the federal budget…
      </div>
    )
  }

  // Resolve the current selection against the live graph so the sheet always
  // reflects fresh pct/expanded state.
  const selectedNode = selectedNodeId ? graph.nodes.find((n) => n.id === selectedNodeId) : null
  const selection = selectedNode ? { kind: 'node', data: selectedNode } : null
  const selectedKey = selectedNode ? `node:${selectedNode.id}` : null

  const docsById = new Map(data.sources.map((s) => [s.id, s]))
  const currentMinistry =
    route.page === 'ministry' && mdata
      ? mdata.ministries.find((m) => m.slug === route.slug)
      : null

  return (
    <div className="flex h-full flex-col">
      <TopBar
        meta={data.meta}
        mode={mode}
        onToggleMode={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))}
        route={route}
        onNavigate={navigate}
        hasMinistries={!!mdata}
      />

      {route.page === 'flow' && (
        <>
          {/* The chart is the hero — it owns all remaining viewport height. When
              the detail sheet is open (>=sm) the chart yields its width and the
              ResizeObserver + framer-motion morph it into the remaining space. */}
          <main
            ref={chartContainerRef}
            className={`relative min-h-0 flex-1 px-2 pb-1 pt-2 transition-[margin] duration-500 ease-in-out sm:px-4 ${
              selection ? 'sm:mr-[400px]' : ''
            }`}
          >
            <Breadcrumb data={data} expandedIds={expandedIds} onCollapseTo={collapse} onReset={reset} />
            <SankeyChart
              graph={graph}
              mode={mode}
              selectedKey={selectedKey}
              onSelectNode={handleNodeClick}
              onSelectLink={handleLinkClick}
              onHover={setHover}
              onBackgroundClick={clearSelection}
            />
          </main>

          <DetailSheet
            selection={selection}
            data={data}
            onOpenChange={(open) => {
              if (!open) clearSelection()
            }}
            onToggleExpand={toggleExpand}
            onSelectNode={handleSelectById}
            chartContainerRef={chartContainerRef}
          />

          <ChartTooltip hover={hover} />
        </>
      )}

      {route.page === 'ministries' && mdata && (
        <main className="min-h-0 flex-1 overflow-y-auto">
          <MinistriesPage
            mdata={mdata}
            docsById={docsById}
            onOpenMinistry={(slug) => navigate(`#/ministry/${encodeURIComponent(slug)}`)}
          />
        </main>
      )}

      {route.page === 'ministry' && mdata && (
        <main className="min-h-0 flex-1 overflow-y-auto">
          {currentMinistry ? (
            <MinistryPage
              ministry={currentMinistry}
              mdata={mdata}
              docsById={docsById}
              onBack={() => navigate('#/ministries')}
            />
          ) : (
            <div className="p-10 text-center text-sm text-muted-foreground">Ministry not found.</div>
          )}
        </main>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t px-4 py-1.5 text-[11px] text-muted-foreground sm:px-6">
        <span>
          All figures in Rs. billion, FY {data.meta.fiscalYear} · every number links to its official{' '}
          <a
            href="https://www.finance.gov.pk/fb_2026_27.html"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2 hover:text-foreground"
          >
            Finance Division source
          </a>
        </span>
        <span className="text-muted-foreground/70">
          Independent visualisation — not an official government product
        </span>
      </footer>
    </div>
  )
}
