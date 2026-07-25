// Data invariant checks. Run locally (`npm run check`) and in CI before every
// deploy — the site's whole value is that its numbers reconcile, so a build
// that breaks these must never reach production.
//
// Exits non-zero with a readable report on any failure.
import { readFileSync } from 'fs'

const TOLERANCE = 1.5 // Rs. billion — absorbs rounding between the rounded
// "at a glance" headline totals and the detailed tables

let failures = 0
const fail = (msg) => {
  console.error(`  ✗ ${msg}`)
  failures++
}
const ok = (msg) => console.log(`  ✓ ${msg}`)

// ---------------------------------------------------------------- budget.json
const budget = JSON.parse(readFileSync('public/data/budget.json', 'utf8'))
const byId = new Map(budget.nodes.map((n) => [n.id, n]))
const sourceIds = new Set(budget.sources.map((s) => s.id))

console.log('budget.json')

// 1. the budget balances: resources into the pool == expenditure out
const inflow = budget.structuralLinks
  .filter((l) => l.target === 'total_resources')
  .reduce((a, l) => a + l.value, 0)
const outflow = budget.structuralLinks
  .filter((l) => l.source === 'total_resources')
  .reduce((a, l) => a + l.value, 0)
Math.abs(inflow - outflow) > 0.001
  ? fail(`budget does not balance: in ${inflow.toFixed(3)} vs out ${outflow.toFixed(3)}`)
  : ok(`balances at Rs ${inflow.toFixed(3)} bn`)

// 2. gross revenue splits exactly into the provincial transfer + net revenue
const gIn = budget.structuralLinks
  .filter((l) => l.target === 'gross_revenue')
  .reduce((a, l) => a + l.value, 0)
const gOut = budget.structuralLinks
  .filter((l) => l.source === 'gross_revenue')
  .reduce((a, l) => a + l.value, 0)
Math.abs(gIn - gOut) > 0.001
  ? fail(`gross revenue split mismatch: ${gIn.toFixed(3)} vs ${gOut.toFixed(3)}`)
  : ok('gross revenue split reconciles')

// 3. every parent equals the sum of its children
const childSums = new Map()
for (const n of budget.nodes) {
  if (n.parent) childSums.set(n.parent, (childSums.get(n.parent) ?? 0) + n.value)
}
let parentMismatches = 0
for (const [pid, sum] of childSums) {
  const parent = byId.get(pid)
  if (!parent) {
    fail(`unknown parent id "${pid}"`)
    continue
  }
  if (Math.abs(parent.value - sum) > TOLERANCE) {
    fail(`"${pid}" is ${parent.value} but its children sum to ${sum.toFixed(3)}`)
    parentMismatches++
  }
}
if (!parentMismatches) ok(`all ${childSums.size} parent nodes equal the sum of their children`)

// 4. every node is traceable to a real source document, and no dangling parents
let sourceProblems = 0
for (const n of budget.nodes) {
  if (!n.source?.docId || !sourceIds.has(n.source.docId)) {
    fail(`node "${n.id}" has a missing or unknown source`)
    sourceProblems++
  }
  if (n.parent && !byId.has(n.parent)) {
    fail(`node "${n.id}" points at missing parent "${n.parent}"`)
    sourceProblems++
  }
}
if (!sourceProblems) ok(`all ${budget.nodes.length} nodes carry a valid source citation`)

// 5. structural links reference real nodes
for (const l of budget.structuralLinks) {
  if (!byId.has(l.source)) fail(`structural link from unknown node "${l.source}"`)
  if (!byId.has(l.target)) fail(`structural link to unknown node "${l.target}"`)
}

// ------------------------------------------------------------ ministries.json
const ministries = JSON.parse(readFileSync('public/data/ministries.json', 'utf8'))
console.log('\nministries.json')

// 6. reconciled output tables really do sum to their stated totals
let outputMismatches = 0
let reconciledCount = 0
for (const m of ministries.ministries) {
  if (!m.outputs) continue
  reconciledCount++
  for (const key of ['actual2425', 'be2526', 'be2627', 'p2728', 'p2829']) {
    const total = m.total?.[key]
    if (total == null) continue
    const sum = m.outputs.reduce((a, o) => a + (o[key] ?? 0), 0)
    if (Math.abs(sum - total) > Math.max(0.01, Math.abs(total) * 0.001)) {
      fail(`${m.slug} ${key}: outputs sum ${sum.toFixed(3)} != total ${total}`)
      outputMismatches++
    }
  }
}
if (!outputMismatches) ok(`${reconciledCount} ministries with shipped output tables reconcile`)

// 7. every shipped demand's object heads sum to its printed total
let demandCount = 0
let demandMismatches = 0
for (const m of ministries.ministries) {
  for (const d of m.demands ?? []) {
    demandCount++
    const sum = d.objects.reduce((a, o) => a + (o.be2627 ?? 0), 0)
    if (Math.abs(sum - d.total.be2627) > 0.002) {
      fail(`demand ${d.no}: objects sum ${sum.toFixed(4)} != total ${d.total.be2627}`)
      demandMismatches++
    }
  }
}
if (!demandMismatches) ok(`all ${demandCount} demand object-splits sum to their printed totals`)

// 8. the hand-transcribed object classification sums to its printed total
const ow = ministries.objectWise
const owSum = ow.items.reduce((a, i) => a + i.value, 0)
Math.abs(owSum - ow.total.be2627) > 0.01
  ? fail(`objectWise sums to ${owSum.toFixed(3)} but the printed total is ${ow.total.be2627}`)
  : ok('object classification sums to the printed Schedule III total')

// --------------------------------------------------------------------- result
if (failures) {
  console.error(`\n${failures} data check(s) FAILED — not safe to publish.`)
  process.exit(1)
}
console.log('\nAll data checks passed.')
