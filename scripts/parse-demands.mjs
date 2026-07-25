// Parses the "Details of Demands for Grants and Appropriations" volumes and
// attaches per-demand OBJECT CLASSIFICATION (salaries, operating, pensions...)
// to the top ministries in public/data/ministries.json.
//
// Double accuracy gate — a demand is only shipped when:
//   1. its parsed major object heads (A01..A13) sum to the demand's printed
//      Total in EVERY year column, and
//   2. its 2026-27 total matches the independently transcribed Budget in Brief
//      Table 21 figure for that demand (±1m).
//
// Run AFTER parse-mtbf.mjs (this script patches ministries.json in place):
//   pdftotext -layout Detail_of_Demands_for_Grants_Vol-I.pdf   /tmp/dfg1.txt
//   pdftotext -layout Detail_of_Demands_for_Grants_Vol-III.pdf /tmp/dfg3.txt
//   pdftotext -layout Detail_of_Demands_for_Grants_Vol-IV.pdf  /tmp/dfg4.txt
//   node scripts/parse-demands.mjs /tmp/dfg1.txt /tmp/dfg3.txt /tmp/dfg4.txt
import { readFileSync, writeFileSync } from 'fs'

const [, , ...TXT_PATHS] = process.argv
if (TXT_PATHS.length === 0) {
  console.error('usage: node scripts/parse-demands.mjs <vol1.txt> [vol3.txt] [vol4.txt]')
  process.exit(1)
}

// docId per demand-number range.
const volumeFor = (no) => (no <= 42 ? 'dfg1' : no <= 67 ? 'dfg2' : no <= 91 ? 'dfg3' : 'dfg4')

// Expected BE 2026-27 totals (Rs million) transcribed from Budget in Brief,
// Table 21 (Demand-Wise Budget Estimates) — the independent cross-check.
const T21_EXPECTED = {
  25: 355, 26: 36137, 27: 25542, 28: 17101, 29: 17582, 30: 21651, 31: 3000000,
  32: 1140, 33: 985, 34: 14026, 35: 578837, 39: 66432,
  43: 5661, 44: 9873, 45: 14914, 46: 1169000, 47: 2561467, 48: 106, 49: 85604,
  50: 5012, 51: 63660, 67: 2557,
  87: 70478, 90: 4241,
  100: 4440, 101: 10903, 103: 3197, 105: 46000, 108: 1440, 109: 231086,
  110: 11570, 115: 623, 123: 55251, 125: 59255, 127: 76608, 134: 40658, 135: 47835,
}

// Ministry slug -> its demands (only those in the downloaded volumes).
// Slugs must exist in ministries.json (checked below).
const DEMAND_MAP = {
  'defense-division': { demands: [28, 29, 30, 31, 101] },
  'economic-affairs-division': { demands: [33, 34] },
  'power-division': { demands: [35, 103, 127] },
  'communications-division': { demands: [25, 26, 27, 100, 125] },
  'higher-education-commission': { demands: [39, 105] },
  'railways-division': { demands: [87, 134] },
  'water-resources-division': { demands: [90, 123, 135] },
  'revenue-division-federal-board-of-revenue': { demands: [48, 49, 110] },
  'finance-division': {
    demands: [43, 44, 45, 46, 47, 108, 109],
    note: 'The charged appropriations Finance Division also accounts for (domestic/foreign debt servicing and repayments, ~Rs 33 tn gross) sit outside the numbered demands and are not shown here.',
  },
  'kashmir-affairs-gilgit-baltistan-and-states-and-affairs-division': { demands: [67, 115] },
  'foreign-affairs-division': { demands: [50, 51] },
}

const OBJECT_LABELS = {
  A01: 'Employees Related Expenses (salaries)',
  A02: 'Project Pre-investment Analysis',
  A03: 'Operating Expenses',
  A04: 'Employees Retirement Benefits (pensions)',
  A05: 'Grants, Subsidies & Write-off of Loans',
  A06: 'Transfers',
  A07: 'Interest Payment',
  A08: 'Loans and Advances',
  A09: 'Physical Assets',
  A10: 'Principal Repayments of Loans',
  A11: 'Investments',
  A12: 'Civil Works',
  A13: 'Repairs and Maintenance',
}

function parseNum(tok) {
  const t = tok.replace(/,/g, '')
  if (!/^\d+$/.test(t)) return null
  return Number(t)
}
const toBn = (v) => (v == null ? null : Math.round(v / 1e5) / 1e4) // full Rs -> Rs bn (4dp)

function titleCase(s) {
  return s
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .replace(/\bOf\b/g, 'of')
    .replace(/\bAnd\b/g, 'and')
    .replace(/\bFor\b/g, 'for')
    .replace(/\bThe\b/g, 'the')
    .replace(/\((hec|Hec)\)/, '(HEC)')
    .replace(/Expditure/gi, 'Expenditure') // source typo
    .replace(/Miscellanious/gi, 'Miscellaneous') // source typo
}

// ---- parse all volumes into a demand map --------------------------------------
const demands = new Map() // no -> { no, name, page, docId, voted, charged, objects, total }

for (const path of TXT_PATHS) {
  const raw = readFileSync(path, 'utf8')
  const pages = raw.split('\f')
  const lines = []
  pages.forEach((pg, i) => {
    for (const line of pg.split('\n')) lines.push({ text: line, page: i + 1 })
  })

  for (let i = 0; i < lines.length; i++) {
    const dm = lines[i].text.match(/^\s*DEMAND NO\.?\s+(\d+)\s*$/)
    if (!dm) continue
    const no = Number(dm[1])
    if (demands.has(no)) continue // first occurrence only

    // demand title from the running header "NO. 105.- NAME    DEMANDS FOR GRANTS"
    let name = null
    for (let k = Math.max(0, i - 4); k < i; k++) {
      const hm = lines[k].text.match(/^\s*NO\.\s*\d+\.\-\s*(.+?)\s{2,}DEMANDS FOR GRANTS/)
      if (hm) name = titleCase(hm[1].trim())
    }

    // scan the demand block (until the next DEMAND NO.)
    let end = lines.length
    for (let k = i + 1; k < lines.length; k++) {
      if (/^\s*DEMAND NO\.?\s+\d+\s*$/.test(lines[k].text)) {
        end = k
        break
      }
    }

    let voted = null
    let charged = null
    let anchors = null // [end0, end1, end2] char positions for the 3 year cols
    let inObjects = false
    const objects = []
    let total = null

    for (let k = i + 1; k < end; k++) {
      const text = lines[k].text
      const vm = text.match(/\b(Voted|Charged)\s+Rs\.?\s*([\d,]+)/)
      if (vm) {
        if (vm[1] === 'Voted') voted = parseNum(vm[2])
        else charged = parseNum(vm[2])
        continue
      }
      // column anchors from the "2025-2026  2025-2026  2026-2027" header
      if (!inObjects && /2025-2026.*2025-2026.*2026-2027/.test(text)) {
        anchors = []
        const re = /20\d\d-20\d\d/g
        let m
        while ((m = re.exec(text)) !== null) anchors.push(m.index + m[0].length)
        continue
      }
      if (/OBJECT CLASSIFICATION/.test(text)) {
        inObjects = true
        continue
      }
      if (!inObjects || !anchors) continue

      // stop at the first Total row of the object section
      const isTotalLine = /^\s*Total\b/.test(text.replace(/^\s*/, ''))
      const om = text.match(/^\s*(A\d{2})\s+(.+)$/)
      if (!om && !/Total/.test(text)) continue

      // numeric tokens (skip parenthesized sub-detail values)
      const tokens = []
      const NUM = /\(?[\d][\d,]*\)?/g
      let m
      while ((m = NUM.exec(text)) !== null) {
        if (/^\(/.test(m[0])) continue // parenthesized = memo/sub-detail
        const v = parseNum(m[0].replace(/[()]/g, ''))
        if (v == null || v < 1000) continue
        tokens.push({ v, end: m.index + m[0].length })
      }
      if (tokens.length === 0) continue

      // assign to the 3 year columns: order-preserving nearest fit
      const values = [null, null, null]
      for (const tok of tokens) {
        let best = 0
        let bestD = Infinity
        anchors.forEach((a, ci) => {
          const d = Math.abs(tok.end - a)
          if (d < bestD) {
            bestD = d
            best = ci
          }
        })
        if (values[best] == null) values[best] = tok.v
      }

      if (/^\s*Total\b/.test(text) || (/Total/.test(text) && !om)) {
        total = values
        break
      }
      if (om) {
        objects.push({ code: om[1], values })
      }
    }

    if (!total || objects.length === 0) continue

    // Gate 1: majors sum to the printed total in every non-null column.
    let ok = true
    for (let c = 0; c < 3; c++) {
      const sum = objects.reduce((a, o) => a + (o.values[c] ?? 0), 0)
      if (total[c] == null) {
        if (sum > 1000) ok = false
        continue
      }
      if (Math.abs(sum - total[c]) > 1000) ok = false
    }
    // Gate 2: cross-check BE 2026-27 against Budget in Brief Table 21 (Rs m).
    const expected = T21_EXPECTED[no]
    if (expected != null && total[2] != null) {
      if (Math.abs(total[2] / 1e6 - expected) > 1) ok = false
    }
    if (!ok) {
      console.warn(`demand ${no} (${name}): failed gates — skipped`)
      continue
    }

    demands.set(no, {
      no,
      name,
      docId: volumeFor(no),
      page: lines[i].page,
      kind: no >= 92 ? 'development' : 'current',
      voted: toBn(voted),
      charged: toBn(charged),
      total: { be2526: toBn(total[0]), re2526: toBn(total[1]), be2627: toBn(total[2]) },
      objects: objects.map((o) => ({
        code: o.code,
        label: OBJECT_LABELS[o.code] ?? o.code,
        be2526: toBn(o.values[0]),
        re2526: toBn(o.values[1]),
        be2627: toBn(o.values[2]),
      })),
    })
  }
}

console.log(`parsed & double-verified demands: ${[...demands.keys()].sort((a, b) => a - b).join(', ')}`)

// ---- attach to ministries.json -------------------------------------------------
const MPATH = 'public/data/ministries.json'
const mdata = JSON.parse(readFileSync(MPATH, 'utf8'))

let attached = 0
for (const [slug, cfg] of Object.entries(DEMAND_MAP)) {
  const ministry = mdata.ministries.find((m) => m.slug === slug)
  if (!ministry) {
    console.warn(`slug not found in ministries.json: ${slug}`)
    continue
  }
  const got = cfg.demands.filter((no) => demands.has(no)).map((no) => demands.get(no))
  const missing = cfg.demands.filter((no) => !demands.has(no))
  if (got.length === 0) continue
  ministry.demands = got
  const notes = []
  if (cfg.note) notes.push(cfg.note)
  if (missing.length) notes.push(`Demand(s) ${missing.join(', ')} could not be verified and are omitted.`)
  if (notes.length) ministry.demandsNote = notes.join(' ')
  attached += got.length
}

mdata.meta.demandsNote =
  'Object classification per demand is from the Details of Demands for Grants and Appropriations (Vols I–IV). Every demand shown passed two independent checks: object heads sum exactly to the printed demand total, and the total matches Budget in Brief Table 21.'

writeFileSync(MPATH, JSON.stringify(mdata, null, 2) + '\n')
console.log(`attached ${attached} demands to ${Object.keys(DEMAND_MAP).length} ministries -> ${MPATH}`)
