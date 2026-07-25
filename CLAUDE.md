# CLAUDE.md — Pakistan Federal Budget 2026–27 Interactive Sankey

Guidance for any AI/dev agent working in this repo. Read this fully before making
changes. **The data is correct and hard-won — do not break or "guess-edit" the
numbers.**

---

## 1. What this project is

An interactive **Sankey diagram** of how Pakistan's federal government earns and
spends money in **FY 2026–27**. Design goals, in priority order:

1. **Accuracy over simplicity** — every figure traces to an official Finance
   Division document (page-level citation shown in the UI).
2. **Progressive disclosure** — a full-viewport chart on landing; clicking a
   flow/node opens sub-flows in place *and* slides in a detail sheet with
   description, YoY comparison and source citation.
3. **Data-driven** — the whole chart is generated from one JSON file so numbers
   are easy to update.

It is a **static site** (Vite + React + Tailwind + shadcn-style components),
deployable to GitHub Pages/Netlify.

---

## 2. Status

The shadcn redesign is **done** (July 2026): full-bleed chart, slim top bar,
slide-in non-modal detail Sheet (hidden until a node/link is clicked), animated
expand/collapse via framer-motion, YoY (Budget + Revised 2025-26) on 80+ nodes,
non-tax/grants sub-line-items, and an ABS function-wise alternative view on
Current Expenditure. Light + dark themes verified via headless-Chrome screenshots.

A **ministry explorer** is also done: hash-routed pages (`#/ministries`,
`#/ministry/<slug>`) with 67 ministries/divisions parsed from the MTBF "Green
Book" (goal, outcomes, service-level budgets across a 5-year horizon), plus the
federal-wide **object classification** (salaries/pensions/operating…) from ABS
Schedule III. See §12.

Also shipped: a **tax receipt** page (`#/receipt`), a **budget basics**
primer + glossary (`#/basics`), **shareable deep links** for chart state
(`#/?e=<expanded-ids>&s=<selected-id>`, mirrored via `history.replaceState`),
and **Open Graph/Twitter social cards** (`public/og-image.png`). The top-left
title is a "home" button back to `#/`.

Social tags need ABSOLUTE urls and crawlers don't run JS, so the origin is
injected at build time by the `socialMeta` plugin in `vite.config.js` from the
`SITE_URL` env var (`.env` or shell), replacing the `__SITE_URL__/` token in
index.html. Without it: relative image + `og:url` dropped, plus a build
warning. Never hardcode a domain in index.html. Everything else is
path-agnostic (`base: './'`).

**ⓘ explainer popovers** (`ObjectInfo` in `bits.jsx`, text in
`src/lib/objectInfo.js`) — two traps, both already hit once:
1. Never put `stopPropagation()` on the trigger's `onClick`. React's synthetic
   `stopPropagation` calls `nativeEvent.stopPropagation()` at the React root,
   which is *below* `document`, so Radix's outside-dismiss listeners never see
   the click. Radix registers its deferred dismiss `{once:true}`, so the
   swallowed click leaves it armed and it fires on the NEXT click — closing the
   popover that just opened (symptom: "both popovers close").
2. Don't give each instance its own open state and coordinate between them
   (event broadcast, "last closer" singleton, …). The dismissal of the old
   popover (document `pointerdown`) and the opening of the new one (trigger
   `click`) arrive in an order we don't control. The working design is a single
   shared `openId` (`infoStore` + `useSyncExternalStore`) where a close request
   only clears the slot if the requester still owns it — correct in either
   order.

---

## 3. Tech stack

- Vite 5 + React 18 (JS, `.jsx` — not TS), `@` alias → `src/`.
- `d3-sankey` for **layout math only**; the SVG is rendered declaratively in
  React (do **not** let d3 mutate the DOM).
- **framer-motion** animates node rects (`motion.g`/`motion.rect`) and link
  paths (`motion.path` with `d` interpolation — sankey paths always share the
  same `M…C…` structure so string interpolation morphs cleanly).
- **Tailwind CSS 3.4** (`darkMode: ['selector', '[data-theme="dark"]']`) +
  hand-vendored shadcn-style components in `src/components/ui/` (`sheet`,
  `button`, `badge`, `separator`) on Radix (`@radix-ui/react-dialog`).
- Do **not** use Radix ScrollArea inside the Sheet — its `display:table`
  viewport lets wide content escape the sheet width. Use a plain
  `overflow-y-auto` div (already the case).

---

## 4. ⚠️ Environment gotchas (will bite you)

- **npm registry:** the machine's global npm points to a private AWS CodeArtifact
  registry with an **expired token**, so a bare `npm install` fails with `E401`.
  A project-level **`.npmrc`** forces the public registry. Keep it. If auth
  errors persist, append `--registry=https://registry.npmjs.org/`.
- **poppler is installed** (`pdftotext`, `pdftoppm`, `pdfinfo`) for re-extracting
  data from the PDFs.
- **These PDFs do not rasterize** with `pdftoppm` (pages render blank), so the
  Read tool's *visual* PDF rendering returns blank images. Use
  `pdftotext -layout <file>.pdf` and verify figures by **cross-table
  reconciliation** (multiple tables report the same headline numbers).
- **Node** v25; **Google Chrome** at `/Applications/Google Chrome.app/...` for
  headless verification (§10); `puppeteer-core` is a devDependency.

---

## 5. Commands

```bash
npm install                 # uses .npmrc -> public registry
npm run dev                 # dev server
npm run build               # static build -> dist/
npm run preview             # preview the build
```

---

## 6. Data — provenance and how to edit it

### Source documents
Downloaded from <https://www.finance.gov.pk/fb_2026_27.html>. The PDFs live in
the repo root but are **gitignored** (re-downloadable; CONTRIBUTING.md has the
regeneration steps). The app does NOT self-host them: every citation links to
the Finance Division's own copy via `officialPdf` on each source in
budget.json (e.g. `https://www.finance.gov.pk/budget/budget_2026_27/Budget_in_Brief.pdf#page=13`).
Those URLs were verified: HTTP 200, `content-type: application/pdf` served
inline (so `#page=` works), byte-identical to the local copies. If the ministry
ever moves them, `sourceHref` in `src/components/bits.jsx` falls back to
`doc.file` — restore local hosting by copying the PDFs to `public/docs/` again.

**Page-number convention (⚠️ two systems):** citations in budget.json for
`bib`/`emfr`/`abs` use the documents' **printed** page numbers (what the UI
displays); each of those sources carries `pageOffset` (all 6 — cover, preface,
contents), which `sourceHref` adds to build the physical `#page=` deep link.
The `mtbf`/`dfg*` pages were derived by counting `\f` page breaks, so they are
**physical** PDF pages already (`pageOffset` 0/omitted) and display = link.
Any new citation must follow the convention of the doc it cites; verify an
offset by probing printed-number marker lines in the pdftotext dump. Light is
the default theme (`initialMode` in App.jsx); dark stays fully supported via
the toggle.

| id | Document | Role |
|----|----------|------|
| `bib` | **Budget in Brief 2026-27** | **Primary** — headline totals (Table 1) + detailed tables (4–17). |
| `abs` | Annual Budget Statement | Cross-checks; function-wise expenditure (p.11); financing detail (p.1). |
| `emfr` | Explanatory Memorandum on Federal Receipts | Deeper receipts detail. |
| `grants` | Regular & Technical Supplementary Grants | Grant/demand detail. |
| `mtbf` | Medium Term Performance Based Budget | Ministry/division context. |

Key tables in Budget in Brief: **T1** Budget at a Glance (p.2), **T2** Deficit &
Financing (p.3), **T3** BE/RE summary (p.4), **T4** Revenue (p.6), **T5** Non-Tax
(p.6–7), **T6** Divisible Pool / provincial transfer (p.8–10), **T8/T9** Public
Account & External (p.12), **T10** Current Expenditures (p.13), **T12** Subsidies
(p.20–21), **T13** Grants (p.22–26), **T17** PSDP (p.29–31). ABS **Summary of
Receipts** (p.1) and **Summary of Expenditure** (p.11) confirm the same figures.

### The single source of truth: `public/data/budget.json`
- `meta` — fiscal year, unit, `totalOutlay` (18771), `grossRevenue` (20600),
  `provincialTransfer` (8848), `yoyLabels`.
- `sources[]` — the documents above.
- `structuralLinks[]` — fixed backbone flows between root/hub nodes.
- `nodes[]` (94) — every box: `id`, `label`, `side`
  (`receipt` | `hub` | `transfer` | `expenditure`), `parent` (id or `null`),
  `value` (Rs. **billion**, BE 2026-27), `prior` (BE 2025-26), `revised`
  (RE 2025-26; both null when not published), `description`,
  `source` `{ docId, page, table }`. Two optional enrichments (rendered in the
  sheet, NOT sankey children — they need not sum to the node):
  - `altBreakdowns[]` — `{ title, note, source, items:[{label, value, prior?}] }`.
    Used for: ABS function-wise + BiB Table-21 demand/ministry-wise views on
    `current_exp`; EMFR gross-by-import-category on `customs` (gross ≠ net, so
    it cannot be children).
  - `facts[]` — `{ title, note, source, items:[{label, value:string}] }` key-value
    cards. Used for: NFC formula + official province percentages on
    `provincial_share`; EMFR Jul–Mar collection performance on the four FBR taxes.

**To change a number:** edit the node's `value`. A parent's `value` must equal
the sum of its children (±1.5 bn tolerance); `src/lib/validateData.js` logs
console warnings on load if violated. "Other …" remainder nodes absorb the tail
of partially-broken-out categories — adjust them when adding line items.

### The numbers must keep balancing
The budget **balances at Rs 18,771.417 bn** (`Σ resources into the pool = Σ
expenditure out`). Verified: hub diff 0.000; gross-revenue split reconciles;
all 84 nodes have valid sources. Preserve these invariants.

---

## 7. The budget model

```
FBR Tax Revenue (15,264) ─┐
Non-Tax Revenue (5,336) ──┴─► Gross Revenue (20,600) ─┬─► Transfer to Provinces / NFC (8,848)
                                                       └─► Net Federal Revenue (11,751) ─┐
Borrowing & Other Financing (7,020) ─────────────────────────────────────────────────────┴─► Total Federal Resources (18,771)
Total Federal Resources ─┬─► Current Expenditure (17,495) ─► interest / defence / pension / grants / subsidies / running / emergency
                         └─► Development & Net Lending (1,276) ─► Federal PSDP (1,000) + Net Lending (276)
```

Gross revenue **splits** into the constitutional provincial transfer (NFC,
Rs 8,848 bn) and net federal revenue — deliberate; the largest single flow
leaves the federal government entirely. Keep it.

**Headlines (Rs bn):** Interest 8,054 (domestic 6,983 / foreign 1,071) · Defence
3,000 · Pension 1,169 (military 822) · Grants 2,680 (BISP 838) · Subsidies 1,091
(power 830) · Running of Civil Govt 1,071 · PSDP 1,000 (NHA 224.5). Provinces:
Punjab 4,403 · Sindh 2,207 · KP 1,443 · Balochistan 795. Notable non-tax: SBP
profit 1,436 (down from 2,400), Petroleum Levy 1,677, Article-164 provincial
receipts 1,035 (new).

---

## 8. Design system (validated — keep it)

Colors validated with the dataviz method (CVD-safe, contrast-checked) for both
surfaces. Categorical roles (CSS vars `--role-*` in `src/index.css`, exposed as
Tailwind colors `receipt` / `expenditure` / `transfer` / `hub`):

| Role | Meaning | Light | Dark |
|------|---------|-------|------|
| receipt | money in | `#1baf7a` | `#199e70` |
| expenditure | federal spending | `#eb6834` | `#d95926` |
| transfer | to provinces (NFC) | `#4a3aa7` | `#9085e9` |
| hub | structural pool | `#64748b` | `#94a3b8` |

shadcn HSL tokens live in `src/index.css` under `:root[data-theme='light'|'dark']`;
the toggle sets `document.documentElement.dataset.theme`. Node labels are always
shown with a surface-colored halo (`.node-label` / `.node-value`) — this is the
contrast-relief for the aqua slot; don't remove it. Figures use tabular-nums.

Percentages use a **labelled, context-appropriate denominator** — revenue-side
as "% of gross revenue" (FBR 74% + non-tax 26% = 100%); everything else "% of
the total budget" (gross revenue exceeds the budget because a slice passes to
provinces). See `percentInfo` / `isRevenueSide` in `buildGraph.js`. In-chart
labels show % only on the expenditure/transfer side.

---

## 9. Architecture / file map

```
public/
  data/budget.json     # SINGLE SOURCE OF TRUTH (see §6)
  docs/*.pdf           # the 5 source PDFs, for deep-links
src/
  main.jsx, index.css  # tailwind + tokens + svg label styles
  App.jsx              # state: data, mode, expandedIds(Set), selection, hover;
                       #   chart margin shifts (sm:mr-[400px]) when sheet open
  components/
    SankeyChart.jsx    # d3-sankey layout -> motion.* SVG; fills container w+h
    DetailSheet.jsx    # non-modal shadcn Sheet; opens when selection != null
    TopBar.jsx         # slim header: title, stats, legend, theme toggle
    Breadcrumb.jsx     # floating chips over the chart for expanded nodes
    ChartTooltip.jsx   # cursor-following hover tooltip
    ui/                # vendored shadcn primitives (sheet/button/badge/separator)
  lib/
    buildGraph.js      # hierarchical data + expandedIds -> {nodes,links} + pct
    validateData.js    # dev-time balance/source checks (console)
    format.js          # PKR/percent formatting + yoyDelta()
    palette.js         # role colors (light/dark)
    utils.js           # cn()
```

### How expansion/selection works
- `expandedIds` is a `Set` in `App.jsx`. A node is **visible** when its parent is
  visible AND expanded (roots always visible). Collapsing removes descendants.
- Clicking a chart node selects it (opens the sheet) and expands it if it has
  hidden children. **Clicking a link resolves to its subject node** (parent-child
  flow → the child; backbone flow → the non-pass-through endpoint, see
  `handleLinkClick`) and opens that node's full sheet — a flow click is never a
  dead end. Escape, the X, or clicking the SVG background closes it. Clicks
  inside the chart while the sheet is open re-target it (`onInteractOutside`
  preventDefault guard).
- The sheet is **non-modal, no overlay** (`modal={false}`, `withOverlay={false}`)
  so the chart stays interactive beside it.
- `selection` is re-derived from the live graph each render so pct/expanded
  state in the sheet stays fresh.

---

## 10. Verification

Pattern (used for every UI change — **always screenshot and look**):
`npm run dev -- --port 5177`, then a puppeteer-core script launching system
Chrome, clicking nodes by matching `.node-label` text inside `svg g` groups,
screenshotting landing / expanded / deep-drill / light-mode, and asserting the
sheet is absent on landing and closes on Escape.

After any data edit:
```bash
node --input-type=module -e '/* load budget.json; assert hub in==out, parents==Σchildren (±1.5), every node has a valid source */'
```

---

## 12. Ministry explorer (`#/ministries`)

**Data pipeline:** `scripts/parse-mtbf.mjs` parses the pdftotext `-layout` dump
of the MTBF Green Book into `public/data/ministries.json`. Regenerate with:

```bash
pdftotext -layout Medium_Term_Performance_Based_Budget.pdf /tmp/mtbf.txt
node scripts/parse-mtbf.mjs /tmp/mtbf.txt
```

Parser design (the hard-won parts — do not regress):
- Sections are found by `PAO:` lines; PDF page numbers come from counting `\f`
  (used for `#page=` deep links).
- All cells are integers in Rs '000 → strip every `.`/`,` (the source has typos
  like `10.903,000`).
- Numeric tokens are matched to year columns by **order-preserving minimum-cost
  alignment** against header anchors (immune to the column shifts on
  continuation pages that lack a repeated year header).
- Logical rows wrap across physical lines: a line's tokens **merge into the
  previous row** when they all fit still-empty columns; otherwise a new row.
- Output names come from text segments starting left of the **midpoint between
  the "Outputs" and "Office" header tokens** (office cells start left of the
  Office header itself).
- **Reconciliation gate:** outputs are only shipped when every year column sums
  to the printed Total (±0.1%); otherwise `outputs: null` and the UI shows the
  verified totals with an honest note. 53/67 reconcile. Known source quirk: the
  Defense Division table's own printed total excludes its development-schemes
  row, so it legitimately fails the gate.
- Cross-validation examples: Railways 111.136 = BiB T21 demands 87+134 exactly;
  Water 107.327 = demands 90+123+135; Finance total verified against the raw
  line (36,394,099,789 '000).
- `objectWise` (ABS Schedule III, PDF p.37 / printed p.31) is hand-transcribed
  in the script; items sum to the printed 51,156.209 total. Gross frame —
  includes Rs 31,959 bn principal repayments (refinancing).

**UI:** hash router in `App.jsx` (`#/` flow, `#/ministries`, `#/ministry/<slug>`);
`MinistriesPage.jsx` (object-wise card + searchable list), `MinistryPage.jsx`
(goal/outcomes cards, 5-year outputs table with share bars, per-demand object
cards, source card), shared bits in `components/bits.jsx` (DeltaBadge,
SourceLine, SourceCard). Ministry amounts use `formatBn` (keeps sub-billion
values readable). Long output names (some Green Book tables use a paragraph as
the name cell, e.g. Pakistan Bait-ul-Mal) are line-clamped, never split.

**Parser regression guards** (bugs already fixed once — keep the tests of these):
- Prose digits must never become budget values: value tokens require position
  ≥ the name/office boundary AND comma-grouping or ≥1,000.
- A Total row can span 3 physical lines (numbers, bare "Total" label, more
  numbers) — merge the adjacent NAMELESS row into the total (Foreign Affairs).
- Reconciliation fails when a total column is null but rows sum materially there.

### Per-demand object classification (Details of Demands for Grants)
`scripts/parse-demands.mjs` parses the Demands volumes and attaches `demands[]`
(object splits: salaries/operating/pensions/grants/assets per parliamentary
demand) to 11 mapped ministries (top-10 + Foreign Affairs) in `ministries.json`.
**Run order matters:** `parse-mtbf.mjs` first (regenerates the file), then
`parse-demands.mjs` (patches it). All four volumes are downloaded: Vol-I
(demands 1–42), Vol-II (43–67), Vol-III (68–91), Vol-IV (92–135, development).
Values are in full rupees in the source (÷1e9 → bn). Double gate: Σ major
object heads (A01…A13) == printed demand Total per year column, AND BE 2026-27
== the Budget in Brief Table 21 figure (`T21_EXPECTED` map in the script).
130/135 demands pass; the 5 failures (38, 68, 75, 76, 80 — multi-section or
charged/voted layout quirks) are skipped loudly, never shipped. Finance
Division's charged debt-servicing appropriations sit outside the numbered
demands (noted in its `demandsNote`).

> Independent visualisation for public understanding — not an official
> government product. Keep this disclaimer in the footer.
