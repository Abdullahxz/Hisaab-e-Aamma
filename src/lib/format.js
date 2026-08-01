// Formatting helpers for PKR budget figures.
// All stored values are in Rs. billion.

// Rs. 18,771 bn -> "Rs 18.77 trillion"; Rs. 430 bn -> "Rs 430 bn".
// Large numbers read more naturally in trillions.
export function formatPKR(billion) {
  if (billion == null || Number.isNaN(billion)) return 'n/a'
  // round before comparing so 999.6 -> "Rs 1.00 tn", not "Rs 1,000 bn"
  if (Math.round(billion) >= 1000) {
    const tn = billion / 1000
    return `Rs ${tn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tn`
  }
  return `Rs ${Math.round(billion).toLocaleString('en-US')} bn`
}

// Compact form for chart labels: "Rs 8,054 bn".
export function formatCompact(billion) {
  if (billion == null || Number.isNaN(billion)) return 'n/a'
  return `Rs ${Math.round(billion).toLocaleString('en-US')} bn`
}

// Table form that keeps sub-billion amounts readable: "Rs 0.48 bn", "Rs 7.1 bn",
// "Rs 112 bn". Used in the ministry explorer where many services are < Rs 1 bn.
export function formatBn(billion) {
  if (billion == null || Number.isNaN(billion)) return 'n/a'
  const abs = Math.abs(billion)
  if (abs >= 100) return `Rs ${Math.round(billion).toLocaleString('en-US')} bn`
  if (abs >= 10) return `Rs ${billion.toFixed(1)} bn`
  if (abs >= 0.005) return `Rs ${billion.toFixed(2)} bn`
  return 'Rs 0 bn'
}

// Format a raw percentage number, e.g. 4.6 -> "4.6%".
export function formatPct(pct) {
  if (pct == null || Number.isNaN(pct)) return 'n/a'
  if (pct >= 10) return `${pct.toFixed(0)}%`
  if (pct >= 1) return `${pct.toFixed(1)}%`
  return `${pct.toFixed(2)}%`
}

// Percentage of a reference total, e.g. 4.6%.
export function formatPercent(value, total) {
  if (!total) return 'n/a'
  return formatPct((value / total) * 100)
}

// Year-over-year change vs the prior budget.
// Returns { kind: 'up'|'down'|'flat'|'new', text } or null when no prior value.
export function yoyDelta(value, prior) {
  if (prior == null) return null
  if (prior === 0) return { kind: 'new', text: 'New in 2026-27' }
  const pct = ((value - prior) / prior) * 100
  if (Math.abs(pct) < 0.05) return { kind: 'flat', text: '±0%' }
  const text = `${pct > 0 ? '+' : '−'}${Math.abs(pct) >= 10 ? Math.abs(pct).toFixed(0) : Math.abs(pct).toFixed(1)}%`
  return { kind: pct > 0 ? 'up' : 'down', text }
}
