// Parses the Medium Term Performance Based Budget ("Green Book") text dump into
// public/data/ministries.json.
//
// The pdftotext -layout dump preserves column x-positions, so each numeric token
// is assigned to a year column by its character offset under the year header —
// this handles rows with missing years (services that start or end mid-horizon).
//
// Accuracy gate: a PAO's "Budget by Outputs" table is only included when the
// parsed output rows sum to the table's printed Total for EVERY year column
// (±0.1%). Sections that fail reconciliation keep their verified Total row only
// (outputs: null) — we never ship numbers we could not reconcile.
//
// Usage:  pdftotext -layout Medium_Term_Performance_Based_Budget.pdf mtbf.txt
//         node scripts/parse-mtbf.mjs mtbf.txt
import { readFileSync, writeFileSync } from 'fs'

const [, , TXT_PATH] = process.argv
if (!TXT_PATH) {
  console.error('usage: node scripts/parse-mtbf.mjs <mtbf.txt>')
  process.exit(1)
}
const raw = readFileSync(TXT_PATH, 'utf8')

// pdftotext emits \f at each page break -> track PDF page numbers for deep links.
const pages = raw.split('\f')
const lines = []
pages.forEach((pageText, i) => {
  for (const line of pageText.split('\n')) {
    lines.push({ text: line, page: i + 1 })
  }
})

const YEARS = ['actual2425', 'be2526', 'be2627', 'p2728', 'p2829']
const YEAR_LABELS = ['2024-25', '2025-26', '2026-27', '2027-28', '2028-29']
const isRunningHeader = (s) =>
  /Medium Term Performance Based Budget FY/.test(s) || /^\s*\d+\s*$/.test(s)

// ---- section discovery: a section starts at a "PAO:" line ---------------------
const sections = []
for (let i = 0; i < lines.length; i++) {
  if (/^\s*PAO[:\s]/.test(lines[i].text)) {
    let t = i - 1
    while (t >= 0 && (lines[t].text.trim() === '' || isRunningHeader(lines[t].text))) t--
    if (t < 0) continue
    const title = lines[t].text.trim().replace(/[:\s]+$/, '')
    sections.push({
      title,
      pao: lines[i].text.replace(/^\s*PAO[:\s]+/, '').trim(),
      start: i,
      page: lines[t].page,
    })
  }
}
sections.forEach((s, idx) => {
  s.end = idx + 1 < sections.length ? sections[idx + 1].start : lines.length
})

// ---- helpers -------------------------------------------------------------------
// All budget cells are integers in Rs '000 — so every '.'/',' is a thousands
// separator (the source even has typos like "10.903,000"). Strip them all.
function parseNum(tok) {
  const neg = /^\(.*\)$/.test(tok)
  const t = tok.replace(/[().,]/g, '')
  if (t === '' || t === '-') return null
  const v = Number(t)
  if (!Number.isFinite(v)) return null
  return neg ? -v : v
}

const toBn = (v) => (v == null ? null : Math.round(v / 1000) / 1000)

function grabBlock(sectionLines, startRe, endRe) {
  const out = []
  let on = false
  for (const { text } of sectionLines) {
    if (!on && startRe.test(text)) {
      on = true
      out.push(text.replace(startRe, '').trim())
      continue
    }
    if (on) {
      if (endRe.test(text)) break
      out.push(text.trim())
    }
  }
  return out.join(' ').replace(/\s+/g, ' ').trim()
}

// Year-header line -> column anchors (end index of each year token).
function yearAnchors(text) {
  const anchors = {}
  let count = 0
  for (let y = 0; y < YEAR_LABELS.length; y++) {
    const idx = text.indexOf(YEAR_LABELS[y])
    if (idx !== -1) {
      anchors[y] = idx + YEAR_LABELS[y].length
      count++
    }
  }
  return count >= 4 ? anchors : null
}

// Order-preserving minimum-cost assignment of numeric tokens to year columns.
// Tokens and columns are both left-to-right ordered, so the correct mapping is
// monotone; minimizing summed |tokenEnd - anchorEnd| makes it immune to the
// uniform column shifts that occur on table-continuation pages (a 5-token line
// has exactly one monotone bijection regardless of shift).
function alignTokens(tokens, anchors) {
  const cols = Object.entries(anchors)
    .map(([y, end]) => ({ y: Number(y), end }))
    .sort((a, b) => a.end - b.end)
  const n = tokens.length
  const m = cols.length
  if (n === 0 || n > m) return null
  const INF = Infinity
  // dp[i][j]: min cost aligning first i tokens within first j columns
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(INF))
  const from = Array.from({ length: n + 1 }, () => Array(m + 1).fill(null))
  for (let j = 0; j <= m; j++) dp[0][j] = 0
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (dp[i][j - 1] < dp[i][j]) {
        dp[i][j] = dp[i][j - 1]
        from[i][j] = 'skip'
      }
      const c = dp[i - 1][j - 1] + Math.abs(tokens[i - 1].end - cols[j - 1].end)
      if (c < dp[i][j]) {
        dp[i][j] = c
        from[i][j] = 'take'
      }
    }
  }
  if (!Number.isFinite(dp[n][m])) return null
  const map = []
  let i = n
  let j = m
  while (i > 0 && j > 0) {
    if (from[i][j] === 'take') {
      map[i - 1] = cols[j - 1].y
      i--
      j--
    } else {
      j--
    }
  }
  return tokens.map((t, k) => ({ col: map[k], v: t.v }))
}

// ---- table parsing -------------------------------------------------------------
function parseSection(sec) {
  const secLines = lines.slice(sec.start, sec.end)
  const goal = grabBlock(secLines, /^\s*1\.\s*Goals?\s*:?/, /^\s*2\.\s*Policy|^\s*3\.\s*Outcome/)
  const outcomes = grabBlock(secLines, /^\s*3\.\s*Outcomes?:?/, /^\s*4\.\s*Budget/)

  const tStart = secLines.findIndex((l) => /Budget by Outputs/.test(l.text))
  if (tStart === -1) return { goal, outcomes, outputs: null, total: null, reconciled: false }

  let anchors = null // { yearIdx: endCol }
  let outputsEndX = null // end col of the "Outputs" header token
  let officeStartX = null // start col of the "Office" header token
  const rows = []
  let total = null

  // Name/office boundary: office CELLS often start left of the "Office" header,
  // so slice at the midpoint between the two header tokens instead.
  const nameBoundary = () => {
    if (outputsEndX != null && officeStartX != null)
      return Math.round((outputsEndX + officeStartX) / 2)
    if (officeStartX != null) return officeStartX - 2
    return anchors ? Math.min(...Object.values(anchors)) - 14 : 0
  }

  // Collect the name cell from text segments (split on 2+ spaces) that start
  // left of the boundary — immune to office text that begins mid-line.
  const nameFromLine = (text) => {
    const parts = []
    const SEG = /\S+(?: \S+)*/g
    let m
    while ((m = SEG.exec(text)) !== null) {
      if (m.index >= nameBoundary()) continue
      if (!/[A-Za-z]/.test(m[0])) continue // numeric segment, not a name
      parts.push(m[0])
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim()
  }

  for (let i = tStart + 1; i < secLines.length; i++) {
    const text = secLines[i].text
    if (/Key Performance|^\s*5\.\s/.test(text)) break
    if (isRunningHeader(text)) continue

    // (re-)anchor columns on every year-header line (repeats after page breaks)
    const a = yearAnchors(text)
    if (a) {
      anchors = a
      continue
    }
    const headerLike = /Rs\.? [Ii]n 000|Medium Term Budget|Actual\s*$|Expenditure|Responsible|^\s*Budget\s*$|^\s*Outputs/.test(
      text
    )
    if (headerLike) {
      const oIdx = text.indexOf('Office')
      if (oIdx !== -1) officeStartX = oIdx
      const uIdx = text.indexOf('Outputs')
      if (uIdx !== -1) outputsEndX = uIdx + 'Outputs'.length
      continue
    }
    if (!anchors) continue

    // numeric tokens with their positions (dots included: source typos like 10.903,000)
    // Guards against prose being read as budget values (e.g. "...162 Schools for
    // Rehabilitation of Child Labour, 165 Women Empowerment Centres..."):
    //  - a value token must START at/right of the name/office boundary, and
    //  - must be comma-grouped or >= 1,000 ('000) — real cells are Rs 1m+.
    const NUM = /\(?-?[\d][\d.,]*\)?/g
    const tokens = []
    let m
    while ((m = NUM.exec(text)) !== null) {
      if (m.index < nameBoundary()) continue
      const v = parseNum(m[0])
      if (v === null || !/\d/.test(m[0])) continue
      if (!/,/.test(m[0]) && Math.abs(v) < 1000) continue
      tokens.push({ v, end: m.index + m[0].length })
    }

    const nameCell = nameFromLine(text)

    if (tokens.length >= 1 && tokens.length <= 5) {
      const assigned = alignTokens(tokens, anchors)
      if (!assigned) continue

      const isTotal = /^Total\b/i.test(nameCell)
      const last = rows[rows.length - 1]
      // Continuation heuristic: a logical row can wrap across physical lines
      // (its later-year values land on the next line). Merge into the previous
      // row when every token fits a still-empty column there and this line has
      // no complete set of its own; otherwise start a new row.
      const canMerge =
        !isTotal &&
        last &&
        !last.closed &&
        assigned.every((t) => t.col != null && last.values[t.col] == null)

      if (isTotal) {
        const values = [null, null, null, null, null]
        for (const t of assigned) if (t.col != null && values[t.col] == null) values[t.col] = t.v
        total = values
        break
      } else if (canMerge && tokens.length < Object.keys(anchors).length) {
        for (const t of assigned) last.values[t.col] = t.v
        if (nameCell) last.name = `${last.name} ${nameCell}`.trim()
      } else {
        const values = [null, null, null, null, null]
        for (const t of assigned) if (t.col != null && values[t.col] == null) values[t.col] = t.v
        // a full line (every year column present) is closed — later token
        // lines must start a NEW row, never merge into this one
        rows.push({ name: nameCell, values, closed: tokens.length >= Object.keys(anchors).length })
      }
    } else if (nameCell && !/^\d+$/.test(nameCell)) {
      if (/^Total\b/i.test(nameCell)) {
        // "Total" label on its own line; numbers follow on the next line(s)
        rows.push({ name: nameCell, values: [null, null, null, null, null], isTotalLabel: true })
      } else if (rows.length > 0) {
        // wrapped name fragment in the name column -> append to the previous row
        rows[rows.length - 1].name = `${rows[rows.length - 1].name} ${nameCell}`.trim()
      }
    } else if (text.trim() === '' && rows.length > 0) {
      rows[rows.length - 1].closed = true
    }
  }

  // handle "Total" label emitted as a bare row (numbers merged after)
  const totalIdx = rows.findIndex((r) => r.isTotalLabel || /^Total\b/i.test(r.name))
  if (!total && totalIdx !== -1) {
    total = rows[totalIdx].values
    // Some tables print the Total across several lines with the label in the
    // middle; the row just above, if NAMELESS, holds the missing columns.
    const prev = rows[totalIdx - 1]
    if (prev && !prev.name) {
      for (let c = 0; c < 5; c++) if (total[c] == null) total[c] = prev.values[c]
      rows.splice(totalIdx - 1) // drop the fragment row + label + anything after
    } else {
      rows.splice(totalIdx)
    }
  }

  if (!total) return { goal, outcomes, outputs: null, total: null, reconciled: false }

  // merge continuation rows: a row with no name inherits the previous row's name?
  // (kept as-is: fragments were appended above)

  // Reconciliation gate: every year column must sum to the printed total.
  // A null total column with material row values is also a failure — it means
  // part of the Total row went unparsed, so nothing can be trusted.
  let reconciled = rows.length > 0
  for (let c = 0; c < 5; c++) {
    const sum = rows.reduce((a, r) => a + (r.values[c] ?? 0), 0)
    if (total[c] == null) {
      if (Math.abs(sum) > 1) reconciled = false
      continue
    }
    if (Math.abs(sum - total[c]) > Math.max(1, Math.abs(total[c]) * 0.001)) {
      reconciled = false
    }
  }

  const mapRow = (values) => Object.fromEntries(YEARS.map((y, i) => [y, toBn(values[i])]))
  return {
    goal,
    outcomes,
    outputs: reconciled
      ? rows.filter((r) => r.name).map((r) => ({ name: r.name, ...mapRow(r.values) }))
      : null,
    total: mapRow(total),
    reconciled,
  }
}

const slugify = (s) =>
  s.toLowerCase().replace(/[’'".,()/]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const ministries = []
const seen = new Set()
for (const sec of sections) {
  if (sec.title.length < 4 || /\.{3,}/.test(sec.title)) continue
  const parsed = parseSection(sec)
  if (!parsed.total) continue
  let slug = slugify(sec.title)
  for (let i = 2; seen.has(slug); i++) slug = `${slugify(sec.title)}-${i}`
  seen.add(slug)
  ministries.push({
    slug,
    name: sec.title,
    pao: sec.pao,
    page: sec.page,
    goal: parsed.goal || null,
    outcomes: parsed.outcomes || null,
    outputs: parsed.outputs,
    total: parsed.total,
    reconciled: parsed.reconciled,
  })
}

// Federal-wide object classification (what the money buys: salaries, pensions,
// operating costs...) — hand-transcribed from the Annual Budget Statement,
// Statement of Object Classification Wise Expenditure (Schedule III), p.31.
// Gross consolidated-fund frame (Rs bn): includes principal repayments
// (refinancing), so the total (51,156) exceeds the Rs 18,771 bn budget frame.
const OBJECT_WISE = {
  title: 'What the money buys — object classification (federal government)',
  note:
    'Gross Federal Consolidated Fund frame: the total (Rs 51,156 bn) includes Rs 31,959 bn of principal debt repayments (refinancing of maturing debt, not expenditure in the Rs 18,771 bn budget frame). Per-ministry object splits are published in the separate Demands for Grants volumes.',
  // printed page (abs pageOffset in budget.json maps it to the physical PDF page)
  source: { docId: 'abs', page: 31, table: 'Schedule III — Object Classification Wise Expenditure' },
  total: { be2627: 51156.209, prior: 37855.301 },
  items: [
    { code: 'A01', label: 'Employees Related Expenses (salaries)', value: 1608.289, prior: 1438.843,
      detail: 'Pay Rs 253 bn (officers 86, other staff 167) + allowances Rs 1,355 bn' },
    { code: 'A04', label: 'Employees Retirement Benefits (pensions)', value: 1176.179, prior: 1065.034 },
    { code: 'A03', label: 'Operating Expenses', value: 2008.258, prior: 1782.38 },
    { code: 'A05', label: 'Grants, Subsidies & Write-off of Loans', value: 3739.676, prior: 3103.344 },
    { code: 'A07', label: 'Interest Payment', value: 8054.005, prior: 8207.255 },
    { code: 'A10', label: 'Principal Repayments of Loans (refinancing)', value: 31958.778, prior: 19679.231 },
    { code: 'A08', label: 'Loans and Advances', value: 1050.605, prior: 1238.381 },
    { code: 'A09', label: 'Physical Assets', value: 971.378, prior: 720.174 },
    { code: 'A12', label: 'Civil Works', value: 438.754, prior: 390.294 },
    { code: 'A11', label: 'Investments', value: 100.234, prior: 187.091 },
    { code: 'A13', label: 'Repairs and Maintenance', value: 27.463, prior: 23.573 },
    { code: 'A06', label: 'Transfers', value: 20.192, prior: 16.982 },
    { code: 'A02', label: 'Project Pre-investment Analysis', value: 2.399, prior: 2.72 },
  ],
}

const reconciledCount = ministries.filter((m) => m.reconciled).length
console.log(
  `sections found: ${sections.length} | with verifiable totals: ${ministries.length} | outputs reconciled: ${reconciledCount}`
)
const grand = ministries.reduce((a, m) => a + (m.total.be2627 ?? 0), 0)
console.log(`sum of PAO totals BE 2026-27: Rs ${grand.toFixed(1)} bn`)

writeFileSync(
  'public/data/ministries.json',
  JSON.stringify(
    {
      meta: {
        title: 'Explore by Ministry',
        unit: 'billion',
        currency: 'PKR',
        note:
          'Ministry/division (Principal Accounting Officer) budgets from the Medium Term Performance Based Budget ("Green Book"), covering current + development allocations. Output-level tables are shown only where every year column reconciles exactly with the printed total.',
        sourceDoc: 'mtbf',
        generatedBy: 'scripts/parse-mtbf.mjs',
        yearLabels: {
          actual2425: 'Actual 2024-25',
          be2526: 'Budget 2025-26',
          be2627: 'Budget 2026-27',
          p2728: 'Plan 2027-28',
          p2829: 'Plan 2028-29',
        },
      },
      objectWise: OBJECT_WISE,
      ministries,
    },
    null,
    2
  ) + '\n'
)
console.log(`wrote public/data/ministries.json (${ministries.length} ministries)`)
