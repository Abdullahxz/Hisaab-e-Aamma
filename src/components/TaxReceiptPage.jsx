import { useMemo, useRef, useState } from 'react'
import { ReceiptText } from 'lucide-react'
import { InfoPopover, SourceLine } from './bits.jsx'
import { formatPct } from '../lib/format.js'
import { trackEvent } from '../lib/usage.js'
import { cn } from '@/lib/utils'

// Of every rupee of income tax collected, the share that leaves for the
// provinces via the NFC divisible pool: Rs 4,246,430m of the Rs 7,480,521m
// income-tax target is provincial (Budget in Brief, Table 6, printed p. 8).
const INCOME_TAX_TO_PROVINCES = 4246.43
const INCOME_TAX_TOTAL = 7480.521

const PRESETS = [50_000, 250_000, 1_000_000]

const fmtRs = (v) =>
  `Rs ${Math.round(v).toLocaleString('en-US')}`

export default function TaxReceiptPage({ data, docsById }) {
  const [amount, setAmount] = useState(250_000)
  const trackedRef = useRef(false)

  // Records that the calculator was used and whether they took a preset or
  // typed their own figure — never the amount itself, which is the visitor's
  // actual tax paid. First interaction only, once per page load.
  const trackUse = (mode) => {
    if (trackedRef.current) return
    trackedRef.current = true
    trackEvent('receipt-used', { mode })
  }

  const model = useMemo(() => {
    const byId = new Map(data.nodes.map((n) => [n.id, n]))
    const total = data.meta.totalOutlay
    // top-level spending categories = children of current_exp + development.
    // Each line carries its node's own description, so a reader who doesn't
    // know what "Grants & Transfers" covers can read it in place.
    const categories = data.nodes
      .filter((n) => n.parent === 'current_exp' || n.parent === 'development')
      .map((n) => ({
        id: n.id,
        label: n.label,
        description: n.description,
        share: n.value / total,
      }))
      .sort((a, b) => b.share - a.share)
    const provinceShare = INCOME_TAX_TO_PROVINCES / INCOME_TAX_TOTAL
    return { categories, provinceShare, byId }
  }, [data])

  const provinces = amount * model.provinceShare
  const federal = amount - provinces
  const rows = model.categories.map((c) => ({ ...c, rupees: federal * c.share }))
  const maxRupees = Math.max(provinces, ...rows.map((r) => r.rupees))

  const setFromInput = (v) => {
    const n = Number(String(v).replace(/[^0-9]/g, ''))
    setAmount(Number.isFinite(n) ? Math.min(n, 10_000_000_000) : 0)
    trackUse('custom')
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <header>
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <ReceiptText className="h-5 w-5 text-receipt" />
          Your tax receipt
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Enter the income tax you pay in a year and see where it goes, first the
          constitutionally-mandated share to the provinces, then the federal budget's own
          priorities. Every share is computed from the official 2026-27 estimates. Tap ⓘ on any
          line for what it covers.
        </p>
      </header>

      {/* input */}
      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <label htmlFor="tax-amount" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Income tax you pay per year (Rs)
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            id="tax-amount"
            inputMode="numeric"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
            value={amount.toLocaleString('en-US')}
            onChange={(e) => setFromInput(e.target.value)}
            className="h-11 w-56 rounded-md border bg-background px-3 text-lg font-bold tabular-nums outline-none ring-ring focus:ring-2"
          />
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setAmount(p)
                trackUse('preset')
              }}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent',
                amount === p && 'border-foreground/40 bg-accent'
              )}
            >
              {fmtRs(p)}
            </button>
          ))}
        </div>
      </section>

      {/* receipt */}
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b bg-muted/40 px-5 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Receipt, how your {fmtRs(amount)} is used
          </div>
        </div>

        <div className="px-5 py-4">
          {/* provinces first: the biggest single claim on an income-tax rupee */}
          <div className="rounded-lg border border-transfer/30 bg-transfer/5 px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              {/* no ⓘ here: this row already carries its explanation below */}
              <span className="text-sm font-semibold">
                To provincial governments{' '}
                <span className="font-normal text-muted-foreground">(NFC divisible pool)</span>
              </span>
              <span className="text-sm font-bold tabular-nums">{fmtRs(provinces)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-transfer"
                style={{ width: `${(provinces / maxRupees) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              The federal government collects this money but never spends it itself and transfers to provinces. Each province then passes its own budget on top of this transfer: schools, hospitals, police and provincial development programmes are funded there.
            </p>
          </div>

          <div className="mt-4 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            The federal share, {fmtRs(federal)}, funds:
          </div>
          <ul>
            {rows.map((r) => (
              <li key={r.id} className="border-b py-2 last:border-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-medium">
                    {r.label}
                    <InfoPopover label={r.label} text={r.description} trackAs={r.id} />
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                    {fmtRs(r.rupees)}
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-expenditure"
                    style={{ width: `${(r.rupees / maxRupees) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-baseline justify-between border-t pt-3 text-sm font-bold">
            <span>Total</span>
            <span className="tabular-nums">{fmtRs(amount)}</span>
          </div>
          {rows[0] && (
            <p className="mt-2 text-xs text-muted-foreground">
              Put differently: about <strong>{fmtRs(rows[0].rupees / 365)} a day</strong> of your
              taxes services the government's debt interest.
            </p>
          )}
        </div>
      </section>

      {/* method */}
      <section className="rounded-xl border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
        <div className="text-[11px] font-semibold uppercase tracking-wider">How this is calculated</div>
        <ul className="mt-2 list-disc space-y-1.5 pl-4">
          <li>
            Of the Rs 7,480.5 bn income-tax target, Rs 4,246.4 bn belongs to the provincial
            divisible pool, so {formatPct(model.provinceShare * 100)} of your income tax is
            attributed to the provinces.{' '}
            <SourceLine
              source={{ docId: 'bib', page: 8, table: 'Table 6' }}
              docsById={docsById}
            />
          </li>
          <li>
            The federal remainder is attributed across spending categories in proportion to their
            share of the Rs {data.meta.totalOutlay.toLocaleString('en-US')} bn total federal
            budget.{' '}
            <SourceLine source={{ docId: 'bib', page: 2, table: 'Table 1' }} docsById={docsById} />
          </li>
          <li>
            This is an illustrative attribution: money is fungible, and the budget is also financed
            by non-tax revenue and borrowing. It shows fiscal priorities, not a literal trace of
            your specific rupees.
          </li>
        </ul>
      </section>
    </div>
  )
}
