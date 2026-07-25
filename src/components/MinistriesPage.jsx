import { useMemo, useState } from 'react'
import { Search, ChevronRight } from 'lucide-react'
import { DeltaBadge, SourceLine } from './bits.jsx'
import { formatBn, formatPKR, formatPct } from '../lib/format.js'
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
  const owMax = Math.max(...ow.items.map((i) => i.value))

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
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ow.note}</p>
        <ul className="mt-4 space-y-1">
          {ow.items.map((it) => (
            <li key={it.code} className="rounded-md px-2 py-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-medium">
                  {it.label}
                  {it.detail && (
                    <span className="ml-1.5 hidden text-[11px] font-normal text-muted-foreground sm:inline">
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
                  className={cn(
                    'h-full rounded-full',
                    it.code === 'A10' ? 'bg-muted-foreground/40' : 'bg-expenditure'
                  )}
                  style={{ width: `${(it.value / owMax) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between px-2">
          <span className="text-xs font-semibold">
            Total (gross frame): {formatPKR(ow.total.be2627)}
          </span>
          <SourceLine source={ow.source} docsById={docsById} />
        </div>
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
