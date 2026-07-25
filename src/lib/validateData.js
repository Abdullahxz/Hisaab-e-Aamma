// Development-time sanity checks on budget.json. Logs warnings to the console
// so data-entry mistakes surface immediately. Tolerance absorbs the small
// rounding differences between the rounded "at a glance" totals and the
// detailed sub-tables (see meta.note in budget.json).

const TOLERANCE = 1.5 // Rs. billion

export function validateData(data) {
  const problems = []
  const byId = new Map(data.nodes.map((n) => [n.id, n]))
  const sourceIds = new Set(data.sources.map((s) => s.id))

  // Every node has a source that resolves to a known document.
  for (const n of data.nodes) {
    if (!n.source || !n.source.docId) {
      problems.push(`Node "${n.id}" is missing a source.`)
    } else if (!sourceIds.has(n.source.docId)) {
      problems.push(`Node "${n.id}" cites unknown source "${n.source.docId}".`)
    }
    if (n.parent && !byId.has(n.parent)) {
      problems.push(`Node "${n.id}" has unknown parent "${n.parent}".`)
    }
  }

  // Each parent's value should equal the sum of its children (within tolerance).
  const childrenSum = new Map()
  for (const n of data.nodes) {
    if (n.parent) childrenSum.set(n.parent, (childrenSum.get(n.parent) || 0) + n.value)
  }
  for (const [pid, sum] of childrenSum) {
    const parent = byId.get(pid)
    if (parent && Math.abs(parent.value - sum) > TOLERANCE) {
      problems.push(
        `Node "${pid}" value ${parent.value} != sum of children ${sum.toFixed(3)}.`
      )
    }
  }

  // Structural links must reference known nodes.
  for (const l of data.structuralLinks) {
    if (!byId.has(l.source)) problems.push(`Structural link source "${l.source}" unknown.`)
    if (!byId.has(l.target)) problems.push(`Structural link target "${l.target}" unknown.`)
  }

  // Hub balance: inflow to total_resources must equal outflow (the budget balances).
  const inflow = data.structuralLinks
    .filter((l) => l.target === 'total_resources')
    .reduce((a, l) => a + l.value, 0)
  const outflow = data.structuralLinks
    .filter((l) => l.source === 'total_resources')
    .reduce((a, l) => a + l.value, 0)
  if (Math.abs(inflow - outflow) > TOLERANCE) {
    problems.push(
      `Budget does not balance: resources ${inflow.toFixed(3)} != expenditure ${outflow.toFixed(3)}.`
    )
  }

  if (problems.length) {
    console.warn(
      `[budget data] ${problems.length} issue(s) found:\n` + problems.map((p) => ' • ' + p).join('\n')
    )
  } else {
    console.info(
      `[budget data] OK — balances at Rs ${inflow.toFixed(1)} bn; every node has a source.`
    )
  }
  return problems
}
