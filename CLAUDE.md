# CLAUDE.md

Working notes for anyone (human or agent) changing this repo. Rules and traps
only; how to build, regenerate data and deploy is in CONTRIBUTING.md.

**The data is correct and hard-won. Never guess-edit a number.**

## The project

An interactive Sankey of Pakistan's federal budget FY 2026-27, plus a ministry
explorer, a personal tax receipt and a glossary. Static site: Vite 5 + React 18
(`.jsx`, no TS), Tailwind, vendored shadcn/Radix components, `@` alias to `src/`.
Priorities in order: accuracy, then progressive disclosure, then everything else.

Routes (hash router in `App.jsx`): `#/basics` (nav calls it Glossary, and it
leads), `#/` flow, `#/ministries`, `#/ministry/<slug>`, `#/receipt`. Flow state
is mirrored into `#/?e=<ids>&s=<id>` so the address bar is always a share link.

```bash
npm install       # .npmrc pins the public registry
npm run dev
npm run check     # data invariants; the CI gate. Run after ANY data edit
npm run build     # -> dist/
```

## Non-negotiables

- **Everything reconciles.** The budget balances at Rs 18,771.417 bn; a parent
  node equals the sum of its children (±1.5 bn); every node cites a real source.
  `npm run check` enforces all of it and CI runs it before every build.
- **Never ship an unverified figure.** The parsers gate on reconciliation and
  drop tables that fail. Omit and say so in the UI rather than approximate.
- **This is the federal budget, not the national one.** Provinces pass their own
  budgets from the NFC transfer, and the federal PSDP is not the country's
  development spending. Copy that could read as a national total must say so.
  Already stated on `total_resources`, `provincial_share`, `development`, `psdp`,
  in `BasicsPage.jsx`, on `MinistriesPage.jsx` and in the footer.
- **Copy style:** no em dashes in anything a visitor reads (JSX, both datasets,
  `source.table` labels, `index.html` meta tags). Comma, semicolon or full stop
  instead; a missing value is `n/a`. No inline `<strong>` in body copy either;
  weight marks structure only. Comments and these docs are exempt. Shipped
  strings for `ministries.json` live in the parser scripts, so fix them there too.
- Keep the "not an official government product" disclaimer in the footer.

## Data

`public/data/budget.json` is the single source of truth for the chart: `meta`,
`sources[]`, `structuralLinks[]` (the fixed backbone), and `nodes[]` with
`id`/`label`/`side`/`parent`/`value` (Rs bn) plus `prior`, `revised`,
`description` and `source {docId, page, table}`. Optional `facts[]` and
`altBreakdowns[]` render in the sheet and deliberately need not sum to the node.
To change a number: edit `value`, keep the parent equal to its children, run
`npm run check`. "Other ..." nodes absorb the remainder of partial breakdowns.

`public/data/ministries.json` is **generated, never hand-edited**. Regenerate
with `parse-mtbf.mjs` first (rewrites the file), then `parse-demands.mjs`
(patches it). Details in CONTRIBUTING.

⚠️ **Two page-numbering systems.** Citations for `bib`/`emfr`/`abs` use the
document's *printed* page number and carry `pageOffset: 6`, which `sourceHref`
adds to build the physical `#page=` link. `mtbf`/`dfg*` pages come from counting
`\f` breaks, so they are already physical (offset 0). Follow the convention of
the document you are citing. Citations link to the Finance Division's own PDFs
via `officialPdf`; `doc.file` is a dead fallback (nothing is self-hosted).

Budget in Brief is the primary document. Its key tables: T1 Budget at a Glance,
T4 Revenue, T5 Non-Tax, T6 divisible pool, T10 Current Expenditure, T12
Subsidies, T13 Grants, T17 PSDP, T21 demand-wise. Every node's `source` already
names the table it came from.

## How the chart works

`buildGraph.js` turns the node tree plus `expandedIds` into `{nodes, links}`.
A node is visible when every ancestor is expanded; roots always are. Clicking a
node selects and expands it; **clicking a flow resolves to its subject node**
(child for parent-child flows, the non-pass-through end for backbone flows) so a
flow click is never a dead end. The detail sheet is non-modal with no overlay,
so the chart stays live beside it, and clicks inside the chart re-target it
rather than closing it.

Percentages use two denominators on purpose: revenue-side is "% of gross
revenue", everything else "% of the total budget". Gross revenue exceeds the
budget because a slice passes to the provinces, so one denominator would produce
misleading values. See `percentInfo` in `buildGraph.js`.

Collapse-all floats over the chart's top-left corner, only at two or more
expanded categories. There are no breadcrumb chips; they covered the flows.

## Traps that have already cost time

- **ⓘ popovers** (`InfoPopover` in `bits.jsx`; every explainer must go through
  it). Two rules: never `stopPropagation()` on the trigger, because React fires
  it below `document` and Radix's outside-dismiss listener stays armed and eats
  the *next* click; and never give instances their own open state, because the
  old popover's dismissal and the new one's opening arrive in an order you don't
  control. The working design is one shared `openId` where closing only clears
  the slot if the requester still owns it.
- **No Radix ScrollArea inside the Sheet.** Its `display:table` viewport lets
  wide content escape the sheet width. Plain `overflow-y-auto`.
- **d3-sankey does layout maths only.** React renders the SVG; never let d3
  touch the DOM. framer-motion morphs node rects and link paths.
- **framer-motion writes `transform` inline**, so it silently drops Tailwind
  translate classes. Animate `x: '-50%'` instead of `-translate-x-1/2`.
- **One `<main>` is shared** by the receipt, basics, ministries and ministry
  pages, so React keeps it mounted across those navigations and it holds its
  `scrollTop` (a ministry used to open halfway down). `pageScrollRef` plus an
  effect on `route.page`/`route.slug` resets it; keep the ref on new pages.
- **`lib/usage.js` must keep that name.** Content blockers match `analytics.js`
  and `tracking.js` by path and refuse the module, which breaks dev entirely.
- **Adding a route?** Update `parseHash`, the title effect in `App.jsx`, and
  `canonicalPath()` in `usage.js`, or its pageviews land on `/`.
- **`SITE_URL` is injected at build time** for the social tags, because crawlers
  don't run JS and need absolute URLs. Never hardcode a domain in `index.html`;
  everything else is path-agnostic (`base: './'`).
- **StrictMode double-invokes effects in dev**, so effect-driven analytics fire
  twice locally and once in a production build. Verify counts against
  `npm run build && npm run preview`, not the dev server.
- **PDFs don't rasterise** (`pdftoppm` renders blank pages, so visual PDF reads
  return nothing). Use `pdftotext -layout` and verify by cross-table
  reconciliation.
- **npm registry:** the machine's global npm points at a private CodeArtifact
  registry with an expired token, so a bare install fails with `E401`. The
  project `.npmrc` fixes it; keep it.

## Analytics

Pageviews and events both go through `lib/usage.js`. Three rules: never send
anything a visitor typed (the receipt records `mode`, never the amount); keep
property values low-cardinality; and keep `glossary-prompt`'s `shown` action,
since it is the denominator that makes every other action meaningful.

## Layout rules worth keeping

- `MinistryPage.jsx` leads every section with **figures, not method**. The
  explanation, the double-gate description and any `demandsNote` sit below the
  demand cards. A ministry whose outputs failed reconciliation shows its five
  verified year totals as cards with the caveat underneath. Don't reorder.
- Role colours (`--role-*`, exposed as Tailwind `receipt`/`expenditure`/
  `transfer`/`hub`) are a CVD-safe, contrast-validated set. Don't swap hues
  casually. The surface-coloured halo on node labels is the contrast relief for
  the light-mode aqua; keep it. Both themes stay polished.

## Verifying

`npm run check` after any data edit. For UI work, look at the result: start
`npm run dev -- --port 5177` and drive system Chrome with `puppeteer-core`
(clicking nodes by matching `.node-label` text), screenshotting both themes.
For analytics, stub `window.umami` before load and assert on the recorded calls.
