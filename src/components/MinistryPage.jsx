import { ArrowLeft, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeltaBadge, SourceCard, SourceLine, ObjectInfo } from './bits.jsx'
import { formatPKR, formatBn, formatPct } from '../lib/format.js'
import { cn } from '@/lib/utils'

const YEAR_COLS = [
  { key: 'actual2425', label: 'Actual 24-25' },
  { key: 'be2526', label: 'Budget 25-26' },
  { key: 'be2627', label: 'Budget 26-27', primary: true },
  { key: 'p2728', label: 'Plan 27-28' },
  { key: 'p2829', label: 'Plan 28-29' },
]

function Cell({ v, primary }) {
  return (
    <td
      className={cn(
        'whitespace-nowrap px-2 py-2 text-right text-xs tabular-nums',
        primary ? 'font-bold' : 'text-muted-foreground'
      )}
    >
      {v != null ? formatBn(v) : '—'}
    </td>
  )
}

// One demand's object classification (salaries / operating / pensions ...) from
// the Details of Demands for Grants volumes.
function DemandCard({ demand, docsById }) {
  const objects = demand.objects
    .filter((o) => o.be2627 != null)
    .slice()
    .sort((a, b) => b.be2627 - a.be2627)
  const max = Math.max(...objects.map((o) => o.be2627), 1e-9)
  const source = {
    docId: demand.docId,
    page: demand.page,
    table: `Demand No. ${demand.no}`,
  }
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="tabular-nums">No. {demand.no}</Badge>
          <span className="text-sm font-bold">{demand.name}</span>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {demand.kind}
          </Badge>
        </div>
        <span className="text-sm font-bold tabular-nums">{formatBn(demand.total.be2627)}</span>
      </div>
      <ul className="mt-3 space-y-1">
        {objects.map((o) => (
          <li key={o.code} className="px-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px]">
                {o.label}
                <ObjectInfo code={o.code} label={o.label} />
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {formatBn(o.be2627)}
                <span className="ml-1.5 text-[10px] text-muted-foreground/70">
                  {formatPct((o.be2627 / demand.total.be2627) * 100)}
                </span>
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-expenditure"
                style={{ width: `${(o.be2627 / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between px-1">
        <span className="text-[11px] text-muted-foreground">
          {demand.charged ? `Charged ${formatBn(demand.charged)} · ` : ''}
          {demand.voted ? `Voted ${formatBn(demand.voted)}` : ''}
        </span>
        <SourceLine source={source} docsById={docsById} />
      </div>
    </div>
  )
}

// Detail page for one ministry/division (PAO): goal, outcomes, and the
// service-level "Budget by Outputs" table across the 5-year horizon.
export default function MinistryPage({ ministry, mdata, docsById, onBack }) {
  const m = ministry
  const outputs = m.outputs
    ? m.outputs.slice().sort((a, b) => (b.be2627 ?? 0) - (a.be2627 ?? 0))
    : null
  const maxOut = outputs ? Math.max(...outputs.map((o) => o.be2627 ?? 0), 1) : 1

  const source = {
    docId: mdata.meta.sourceDoc,
    page: m.page,
    table: `${m.name} — Budget by Outputs`,
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> All ministries
      </Button>

      <header>
        <h2 className="text-2xl font-bold tracking-tight">{m.name}</h2>
        {m.pao && <div className="mt-0.5 text-sm text-muted-foreground">PAO: {m.pao}</div>}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-3xl font-bold tracking-tight tabular-nums">
            {formatPKR(m.total.be2627)}
          </span>
          <DeltaBadge value={m.total.be2627} prior={m.total.be2526} />
          <span className="text-sm text-muted-foreground">
            budget 2026-27 (current + development)
          </span>
        </div>
      </header>

      {(m.goal || m.outcomes) && (
        <section className="grid gap-3 sm:grid-cols-2">
          {m.goal && (
            <div className="rounded-xl border bg-card p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Goal
              </div>
              <p className="mt-1 text-sm leading-relaxed">{m.goal}</p>
            </div>
          )}
          {m.outcomes && (
            <div className="rounded-xl border bg-card p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Outcomes
              </div>
              <p className="mt-1 text-sm leading-relaxed">{m.outcomes}</p>
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-4">
          <h3 className="text-sm font-bold">Budget by service (outputs)</h3>
          <span className="text-[11px] text-muted-foreground">Rs. billion · medium-term horizon</span>
        </div>

        {outputs ? (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 text-left font-semibold">Service / output</th>
                  {YEAR_COLS.map((c) => (
                    <th
                      key={c.key}
                      className={cn('px-2 py-2 text-right font-semibold', c.primary && 'text-foreground')}
                    >
                      {c.label}
                    </th>
                  ))}
                  <th className="w-24 px-4 py-2 text-right font-semibold">Share</th>
                </tr>
              </thead>
              <tbody>
                {outputs.map((o) => (
                  <tr key={o.name} className="border-b last:border-0 hover:bg-accent/50">
                    <td className="max-w-[300px] px-4 py-2 text-[13px] font-medium leading-snug">
                      {/* some Green Book tables use a whole paragraph as the
                          output name (e.g. Pakistan Bait-ul-Mal) — clamp it */}
                      <span className="line-clamp-3" title={o.name}>
                        {o.name}
                      </span>
                    </td>
                    {YEAR_COLS.map((c) => (
                      <Cell key={c.key} v={o[c.key]} primary={c.primary} />
                    ))}
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {o.be2627 != null && m.total.be2627
                            ? formatPct((o.be2627 / m.total.be2627) * 100)
                            : '—'}
                        </span>
                        <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-expenditure"
                            style={{ width: `${((o.be2627 ?? 0) / maxOut) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/40 font-semibold">
                  <td className="px-4 py-2 text-[13px]">Total</td>
                  {YEAR_COLS.map((c) => (
                    <Cell key={c.key} v={m.total[c.key]} primary={c.primary} />
                  ))}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="m-4 flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              The service-level table for this ministry could not be reconciled against its printed
              total in the source document, so it is not shown — only the independently verified
              totals are. Open the source below to read the full table as published.
              <span className="mt-1 block font-medium text-foreground">
                Verified totals: {YEAR_COLS.map((c) => `${c.label}: ${m.total[c.key] != null ? formatBn(m.total[c.key]) : '—'}`).join(' · ')}
              </span>
            </span>
          </div>
        )}
      </section>

      {m.demands?.length > 0 && (
        <section>
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold">
              What the money buys — object classification, demand by demand
            </h3>
            <span className="text-[11px] text-muted-foreground">
              salaries · operating · pensions · grants · assets
            </span>
          </div>
          <p className="mb-3 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Each parliamentary demand for grants under this ministry, broken down by object of
            expenditure, from the Details of Demands for Grants and Appropriations. Every figure
            shown passed two checks: object heads sum exactly to the demand’s printed total, and
            that total matches Budget in Brief Table 21.
          </p>
          {m.demandsNote && (
            <div className="mb-3 flex max-w-3xl items-start gap-2 rounded-lg border border-dashed p-2.5 text-[11px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {m.demandsNote}
            </div>
          )}
          <div className="grid gap-3 lg:grid-cols-2">
            {m.demands.map((dm) => (
              <DemandCard key={dm.no} demand={dm} docsById={docsById} />
            ))}
          </div>
        </section>
      )}

      <SourceCard source={source} docsById={docsById} />

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Figures are the Green Book’s combined current + development allocations for this PAO, in the
        gross frame (they can differ from single demands in the Budget in Brief). Output tables are
        shown only when every year column sums exactly to the printed total.
      </p>
    </div>
  )
}
