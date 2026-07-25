import { useMemo, useState } from 'react'
import { Search, ChevronRight } from 'lucide-react'
import { DeltaBadge, SourceLine, ObjectInfo } from './bits.jsx'
import { Separator } from '@/components/ui/separator'
import { formatBn, formatPKR } from '../lib/format.js'
import { cn } from '@/lib/utils'

// Landing page of the ministry explorer: the federal-wide object classification
// (what the money buys: salaries, pensions, ...) + a searchable, sorted list of
// every ministry/division (PAO) from the Green Book.
export default function MinistriesPage({ mdata, docsById, onOpenMinistry }) {
  const [query, setQuery] = useState('')

  const ministries = useMemo(
    () =>
      mdata.ministries
        .slice()
        .sort((a, b) => (b.total.be2627 ?? 0) - (a.total.be2627 ?? 0)),
    [mdata]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ministries
    return ministries.filter(
      (m) => m.name.toLowerCase().includes(q) || (m.pao ?? '').toLowerCase().includes(q)
    )
  }, [ministries, query])

  const ow = mdata.objectWise
  // A10 (principal repayments) is debt rollover, not expenditure — it is shown
  // below a divider as a memo item so the bars reflect the true scale of the
  // real expenses.
  const expenses = ow.items.filter((i) => i.code !== 'A10')
  const memo = ow.items.find((i) => i.code === 'A10')
  const owMax = Math.max(...expenses.map((i) => i.value))
  const expensesTotal = expenses.reduce((a, i) => a + i.value, 0)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      <header>
        <h2 className="text-xl font-bold tracking-tight">Explore by ministry</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Every ministry and division (Principal Accounting Officer) with its full budget —
          current + development — and the services it delivers, from the{' '}
          <span className="font-medium text-foreground">Medium Term Performance Based Budget</span>{' '}
          (the “Green Book”). Amounts are Rs. billion.
        </p>
      </header>

      {/* Federal-wide object classification: the salaries / pensions / line-item view */}
      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <h3 className="text-sm font-bold">{ow.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          What the federal government's money actually buys, across all ministries. Tap ⓘ on any
          line for what it means. Debt <em>refinancing</em> is shown separately below the line — it
          is not expenditure.
        </p>
        <ul className="mt-4 space-y-1">
          {expenses.map((it) => (
            <li key={it.code} className="rounded-md px-2 py-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-medium">
                  {it.label}
                  <ObjectInfo code={it.code} label={it.label} />
                  {it.detail && (
                    <span className="ml-1 hidden text-[11px] font-normal text-muted-foreground lg:inline">
                      — {it.detail}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <DeltaBadge value={it.value} prior={it.prior} className="hidden sm:inline-flex" />
                  <span className="w-24 text-right text-xs font-semibold tabular-nums">
                    {formatBn(it.value)}
                  </span>
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-expenditure"
                  style={{ width: `${(it.value / owMax) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center justify-between px-2 text-xs font-semibold">
          <span>Total expenditure &amp; lending (gross)</span>
          <span className="tabular-nums">{formatPKR(expensesTotal)}</span>
        </div>

        {memo && (
          <>
            <Separator className="my-3" />
            <div className="rounded-md bg-muted/40 px-2 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Below the line — debt rollover, not expenditure
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-medium text-muted-foreground">
                  {memo.label}
                  <ObjectInfo code={memo.code} label={memo.label} />
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <DeltaBadge value={memo.value} prior={memo.prior} className="hidden sm:inline-flex" />
                  <span className="w-24 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                    {formatBn(memo.value)}
                  </span>
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Maturing debt paid off by issuing new debt — matched by equally large borrowing on
                the receipts side, so it funds no services and sits outside the Rs 18,771 bn budget
                frame. Included here because the official schedule reports it.
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between px-2">
              <span className="text-xs text-muted-foreground">
                Schedule total incl. refinancing: {formatPKR(ow.total.be2627)}
              </span>
              <SourceLine source={ow.source} docsById={docsById} />
            </div>
          </>
        )}
      </section>

      {/* Ministry list */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold">
            Ministries &amp; divisions{' '}
            <span className="font-normal text-muted-foreground">({filtered.length})</span>
          </h3>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-bwignore
              aria-label="Search ministries"
              placeholder="Search ministries…"
              className="h-9 w-64 rounded-md border bg-card pl-8 pr-3 text-sm outline-none ring-ring placeholder:text-muted-foreground focus:ring-2"
            />
          </label>
        </div>

        <ul className="overflow-hidden rounded-xl border bg-card">
          {filtered.map((m, i) => (
            <li key={m.slug} className={cn(i > 0 && 'border-t')}>
              <button
                onClick={() => onOpenMinistry(m.slug)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{m.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {m.outputs
                      ? `${m.outputs.length} service line${m.outputs.length === 1 ? '' : 's'}`
                      : 'total verified'}
                    {m.goal ? ` · ${m.goal}` : ''}
                  </div>
                </div>
                <DeltaBadge value={m.total.be2627} prior={m.total.be2526} className="hidden sm:inline-flex" />
                <span className="w-28 shrink-0 text-right text-sm font-bold tabular-nums">
                  {formatBn(m.total.be2627)}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              No ministries match “{query}”
            </li>
          )}
        </ul>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Ministry totals are the Green Book PAO budgets (current + development, gross frame). Large
          structural budgets sit with their accounting ministry — e.g. debt servicing &amp;
          repayments under Finance Division, external repayments under Economic Affairs, Defence
          Services under Defense Division.
        </p>
      </section>
    </div>
  )
}
