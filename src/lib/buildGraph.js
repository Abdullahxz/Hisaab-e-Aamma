// Transforms the hierarchical budget data + the current expansion state into a
// flat { nodes, links } graph that d3-sankey can lay out.
//
// Model:
//  - Every node may have a `parent`. A node is VISIBLE when its parent is
//    visible AND expanded (root nodes, parent === null, are always visible).
//  - `structuralLinks` are the fixed backbone flows between root/hub nodes and
//    are always present.
//  - Each visible non-root node contributes ONE parent<->child flow link whose
//    value is the child's own value. Direction depends on side: receipts flow
//    child -> parent (rightward toward the revenue pool); everything else flows
//    parent -> child (rightward away from the pool). Because a category's
//    children sum to the category total, each node's inflow equals its outflow
//    and the Sankey stays balanced.
//  - A visible node that is NOT expanded is a terminal in the current view; the
//    flow simply stops there.

function linkRole(srcSide, tgtSide) {
  if (srcSide === 'transfer' || tgtSide === 'transfer') return 'transfer'
  if (srcSide === 'expenditure' || tgtSide === 'expenditure') return 'expenditure'
  return 'receipt'
}

// Revenue-side amounts (FBR, non-tax, the divisible pool and its transfer) are
// most intuitively read as a share of GROSS REVENUE — so FBR + non-tax sum to
// 100%. Everything else (financing, the resource pool, all spending) is read as
// a share of the TOTAL BUDGET OUTLAY. Percentages are always shown with their
// denominator so the two references never get confused.
const REVENUE_ROOTS = new Set([
  'fbr_tax',
  'nontax',
  'gross_revenue',
  'net_federal_revenue',
  'provincial_share',
])

function isRevenueSide(node, byId) {
  let cur = node
  while (cur.parent) cur = byId.get(cur.parent)
  return REVENUE_ROOTS.has(cur.id)
}

function percentInfo(value, revenueSide, meta) {
  const basis = revenueSide ? meta.grossRevenue : meta.totalOutlay
  const pct = basis ? (value / basis) * 100 : 0
  return {
    pct,
    pctShort: revenueSide ? 'of gross revenue' : 'of budget',
    pctLabel: revenueSide
      ? 'of gross revenue'
      : 'of the total federal budget',
  }
}

export function buildGraph(data, expandedIds) {
  const byId = new Map(data.nodes.map((n) => [n.id, n]))
  const expanded = expandedIds instanceof Set ? expandedIds : new Set(expandedIds)

  // Which node ids actually have children (drives the expand affordance).
  const hasChildren = new Set()
  for (const n of data.nodes) {
    if (n.parent) hasChildren.add(n.parent)
  }

  // A node is visible if every ancestor up to a root is expanded.
  const isVisible = (node) => {
    let cur = node
    while (cur.parent) {
      const parent = byId.get(cur.parent)
      if (!parent) return false
      if (!expanded.has(parent.id)) return false
      cur = parent
    }
    return true
  }

  const visibleNodes = data.nodes.filter(isVisible)
  const visibleIds = new Set(visibleNodes.map((n) => n.id))

  const meta = data.meta
  const links = []

  // A link's percentage basis follows its role: revenue and transfer flows are a
  // share of gross revenue, spending flows a share of the budget.
  const pushLink = (source, target, value, role) => {
    const info = percentInfo(value, role !== 'expenditure', meta)
    links.push({ source, target, value, role, ...info })
  }

  // 1. Backbone links between always-visible root/hub nodes.
  for (const l of data.structuralLinks) {
    if (!visibleIds.has(l.source) || !visibleIds.has(l.target)) continue
    const src = byId.get(l.source)
    const tgt = byId.get(l.target)
    pushLink(l.source, l.target, l.value, linkRole(src.side, tgt.side))
  }

  // 2. Parent <-> child flow links for every visible non-root node.
  for (const n of visibleNodes) {
    if (!n.parent) continue
    const parent = byId.get(n.parent)
    const from = n.side === 'receipt' ? n.id : parent.id
    const to = n.side === 'receipt' ? parent.id : n.id
    pushLink(from, to, n.value, linkRole(byId.get(from).side, byId.get(to).side))
  }

  const nodes = visibleNodes.map((n) => {
    const revenueSide = isRevenueSide(n, byId)
    return {
      id: n.id,
      label: n.label,
      side: n.side,
      value: n.value,
      prior: n.prior ?? null,
      revised: n.revised ?? null,
      parent: n.parent ?? null,
      description: n.description,
      source: n.source,
      altBreakdowns: n.altBreakdowns ?? null,
      facts: n.facts ?? null,
      hasChildren: hasChildren.has(n.id),
      expanded: expanded.has(n.id),
      ...percentInfo(n.value, revenueSide, meta),
    }
  })

  return { nodes, links }
}

// The set of root node ids — the landing (collapsed) view.
export function rootIds(data) {
  return data.nodes.filter((n) => n.parent == null).map((n) => n.id)
}
