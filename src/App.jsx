import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import SankeyChart from './components/SankeyChart.jsx'
import DetailSheet from './components/DetailSheet.jsx'
import Breadcrumb from './components/Breadcrumb.jsx'
import TopBar from './components/TopBar.jsx'
import ChartTooltip from './components/ChartTooltip.jsx'
import MinistriesPage from './components/MinistriesPage.jsx'
import MinistryPage from './components/MinistryPage.jsx'
import TaxReceiptPage from './components/TaxReceiptPage.jsx'
import BasicsPage from './components/BasicsPage.jsx'
import { buildGraph } from './lib/buildGraph.js'
import { validateData } from './lib/validateData.js'
import { OFFICIAL_BUDGET_URL, REPORT_ERROR_URL } from './lib/site.js'
import { trackPageview, trackEvent } from './lib/usage.js'

const BASE = import.meta.env.BASE_URL

// Light is the default; the toggle switches to dark on demand.
function initialMode() {
  return 'light'
}

// Tiny hash router:
//   '#/'                    -> flow (optionally '#/?e=<ids>&s=<id>' — shareable
//                              deep link carrying expanded nodes + selection)
//   '#/ministries'          -> ministry list
//   '#/ministry/<slug>'     -> ministry detail
//   '#/receipt'             -> personal tax receipt
//   '#/basics'              -> budget basics / glossary
function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '')
  if (h === 'ministries') return { page: 'ministries' }
  if (h === 'receipt') return { page: 'receipt' }
  if (h === 'basics') return { page: 'basics' }
  const m = h.match(/^ministry\/(.+)$/)
  if (m) {
    // a truncated/mangled shared link must not white-screen the app
    try {
      return { page: 'ministry', slug: decodeURIComponent(m[1]) }
    } catch {
      return { page: 'ministries' }
    }
  }
  // flow, with optional chart state in the query part of the hash
  const q = h.match(/^\??(.*)$/)?.[1] ?? ''
  const params = new URLSearchParams(q)
  const expanded = (params.get('e') ?? '').split(',').filter(Boolean)
  const selected = params.get('s') || null
  return { page: 'flow', expanded, selected }
}

// Serialize flow state into a shareable hash. Node ids are [a-z0-9_] and
// commas are legal in a fragment, so the link stays human-readable.
function flowHash(expandedIds, selectedNodeId) {
  const parts = []
  if (expandedIds.size > 0) parts.push(`e=${[...expandedIds].sort().join(',')}`)
  if (selectedNodeId) parts.push(`s=${selectedNodeId}`)
  return parts.length ? `#/?${parts.join('&')}` : '#/'
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
  // undefined = loading, null = failed to load, object = ready
  const [mdata, setMdata] = useState(undefined)
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

  // Route-aware page title (deep links, tabs, history entries).
  useEffect(() => {
    const base = 'Pakistan Federal Budget 2026–27'
    document.title =
      route.page === 'ministries'
        ? `Ministries · ${base}`
        : route.page === 'ministry'
          ? `${mdata?.ministries.find((m) => m.slug === route.slug)?.name ?? 'Ministry'} · ${base}`
          : route.page === 'receipt'
            ? `Your tax receipt · ${base}`
            : route.page === 'basics'
              ? `Budget basics · ${base}`
              : base
  }, [route, mdata])

  // --- shareable deep links -------------------------------------------------
  // Apply chart state FROM the hash whenever navigation happens (initial load,
  // back/forward, pasted link, tab click). Our own state changes go through
  // history.replaceState, which fires no hashchange, so this cannot loop.
  useEffect(() => {
    if (route.page !== 'flow' || !data) return
    const byId = new Map(data.nodes.map((n) => [n.id, n]))
    const next = new Set((route.expanded ?? []).filter((id) => byId.has(id)))
    let selected = route.selected && byId.has(route.selected) ? route.selected : null
    // a selected node must be visible: expand its ancestors
    for (let cur = selected ? byId.get(selected) : null; cur?.parent; cur = byId.get(cur.parent)) {
      next.add(cur.parent)
    }
    setExpandedIds((prev) =>
      prev.size === next.size && [...next].every((id) => prev.has(id)) ? prev : next
    )
    setSelectedNodeId(selected)
  }, [route, data])

  // Reflect chart state INTO the URL so the address bar is always a shareable
  // link. Uses the pre-tracker replaceState (see index.html) so these updates
  // are not counted as page navigations.
  useEffect(() => {
    if (route.page !== 'flow' || !data) return
    const h = flowHash(expandedIds, selectedNodeId)
    if (window.location.hash === h) return
    const replaceState = window.__replaceState ?? window.history.replaceState.bind(window.history)
    replaceState(null, '', h)
  }, [expandedIds, selectedNodeId, route.page, data])

  // One pageview per logical page. Keyed on page/slug rather than the whole
  // route object so that mirroring chart state into the URL never counts as a
  // navigation (see src/lib/usage.js).
  useEffect(() => {
    trackPageview(route)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.page, route.slug])

  const graph = useMemo(() => (data ? buildGraph(data, expandedIds) : null), [data, expandedIds])

  // A collapse can remove the hovered element without a mouseleave firing —
  // drop the tooltip whenever the visible graph changes.
  useEffect(() => setHover(null), [graph])

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
      trackEvent('node-open', { node: node.id })
      if (node.hasChildren && !expandedIds.has(node.id)) expand(node.id)
    },
    [expandedIds, expand]
  )

  // Selecting from the breakdown list inside the sheet.
  const handleSelectById = useCallback(
    (id) => {
      setSelectedNodeId(id)
      trackEvent('node-open', { node: id })
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
        hasMinistries={mdata !== null}
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

      {route.page === 'receipt' && (
        <main className="min-h-0 flex-1 overflow-y-auto">
          <TaxReceiptPage data={data} docsById={docsById} />
        </main>
      )}

      {route.page === 'basics' && (
        <main className="min-h-0 flex-1 overflow-y-auto">
          <BasicsPage data={data} docsById={docsById} />
        </main>
      )}

      {(route.page === 'ministries' || route.page === 'ministry') && (
        <main className="min-h-0 flex-1 overflow-y-auto">
          {mdata === undefined ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Loading ministries…
            </div>
          ) : mdata === null ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              The ministry dataset could not be loaded. Try reloading the page.
            </div>
          ) : route.page === 'ministries' ? (
            <MinistriesPage
              mdata={mdata}
              docsById={docsById}
              onOpenMinistry={(slug) => {
                trackEvent('ministry-open', { ministry: slug })
                navigate(`#/ministry/${encodeURIComponent(slug)}`)
              }}
            />
          ) : currentMinistry ? (
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
            href={OFFICIAL_BUDGET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2 hover:text-foreground"
          >
            Finance Division source
          </a>{' '}
          ·{' '}
          <a
            href={REPORT_ERROR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2 hover:text-foreground"
          >
            Report an error
          </a>
        </span>
        <span className="text-muted-foreground/70">
          Independent visualisation — not an official government product
        </span>
      </footer>
    </div>
  )
}
