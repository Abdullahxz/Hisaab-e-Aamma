import { Shrink, Expand } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { DeltaBadge, SourceLine, SourceCard } from './bits.jsx'
import { formatPKR, formatCompact, formatPct } from '../lib/format.js'
import { ROLE_LABELS } from '../lib/palette.js'
import { cn } from '@/lib/utils'

const ROLE_TEXT = {
  receipt: 'text-receipt',
  expenditure: 'text-expenditure',
  transfer: 'text-transfer',
  hub: 'text-hub',
}
const ROLE_BG = {
  receipt: 'bg-receipt',
  expenditure: 'bg-expenditure',
  transfer: 'bg-transfer',
  hub: 'bg-hub',
}

// Key facts groups — e.g. the NFC formula and official province percentages.
function FactsGroup({ group, docsById }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {group.title}
      </div>
      {group.note && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{group.note}</p>}
      <dl className="mt-2 space-y-1">
        {group.items.map((f) => (
          <div key={f.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-[13px]">{f.label}</dt>
            <dd className="shrink-0 text-[13px] font-semibold tabular-nums">{f.value}</dd>
          </div>
        ))}
      </dl>
      {group.source && <SourceLine source={group.source} docsById={docsById} className="mt-2" />}
    </div>
  )
}

function YoYBlock({ node, yoyLabels }) {
  if (node.prior == null && node.revised == null) return null
  const cell = (label, v) => (
    <div className="flex-1 rounded-md bg-muted/50 px-2.5 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{v != null ? formatCompact(v) : '—'}</div>
    </div>
  )
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          vs last year
        </span>
        <DeltaBadge value={node.value} prior={node.prior} />
      </div>
      <div className="flex gap-1.5">
        {cell(yoyLabels?.prior ?? 'Budget 2025-26', node.prior)}
        {cell(yoyLabels?.revised ?? 'Revised 2025-26', node.revised)}
        {cell('Budget 2026-27', node.value)}
      </div>
    </div>
  )
}

function BreakdownList({ title, note, items, parentValue, onSelect, maxShown = 16, docsById, source }) {
  const sorted = items.slice().sort((a, b) => b.value - a.value).slice(0, maxShown)
  const max = sorted[0]?.value || 1
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {note && <p className="mb-2 text-xs leading-relaxed text-muted-foreground">{note}</p>}
      <ul className="space-y-0.5">
        {sorted.map((c) => {
          const row = (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-medium">{c.label}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatCompact(c.value)}
                  {parentValue ? (
                    <span className="ml-1.5 text-[10px] text-muted-foreground/70">
                      {formatPct((c.value / parentValue) * 100)}
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground/50"
                  style={{ width: `${(c.value / max) * 100}%` }}
                />
              </div>
            </>
          )
          return (
            <li key={c.id ?? c.label}>
              {onSelect && c.id ? (
                <button
                  onClick={() => onSelect(c.id)}
                  className="w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
                >
                  {row}
                </button>
              ) : (
                <div className="px-2 py-1.5">{row}</div>
              )}
            </li>
          )
        })}
      </ul>
      {items.length > maxShown && (
        <div className="mt-1 px-2 text-[11px] text-muted-foreground">
          + {items.length - maxShown} smaller items
        </div>
      )}
      {source && <SourceLine source={source} docsById={docsById} className="mt-2 px-2" />}
    </div>
  )
}

export default function DetailSheet({
  selection,
  data,
  onOpenChange,
  onToggleExpand,
  onSelectNode,
  chartContainerRef,
}) {
  const docsById = new Map(data.sources.map((s) => [s.id, s]))
  const open = !!selection

  // Keep clicks inside the chart from closing the sheet — they re-target it.
  const handleInteractOutside = (e) => {
    if (chartContainerRef?.current?.contains(e.target)) e.preventDefault()
  }

  let body = null
  if (selection) {
    const node = selection.data
    const children = data.nodes.filter((x) => x.parent === node.id)
    const parent = node.parent ? data.nodes.find((x) => x.id === node.parent) : null
    body = (
      <>
        <div className="px-5 pt-5">
          <div className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-full', ROLE_BG[node.side])} />
            <span className={cn('text-[11px] font-semibold uppercase tracking-wider', ROLE_TEXT[node.side])}>
              {ROLE_LABELS[node.side]}
            </span>
          </div>
          <SheetTitle className="mt-1.5 text-xl leading-snug">{node.label}</SheetTitle>
          <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{formatPKR(node.value)}</div>
          <SheetDescription className="mt-1">
            {formatCompact(node.value)} · {formatPct(node.pct)} {node.pctLabel}
            {parent && (
              <>
                {' · '}
                {formatPct((node.value / parent.value) * 100)} of {parent.label}
              </>
            )}
          </SheetDescription>
          {node.hasChildren && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => onToggleExpand(node.id)}
            >
              {node.expanded ? <Shrink className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
              {node.expanded ? 'Collapse in chart' : 'Expand in chart'}
            </Button>
          )}
        </div>

        <div className="space-y-5 px-5 pb-6 pt-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{node.description}</p>

          <YoYBlock node={node} yoyLabels={data.meta.yoyLabels} />

          {node.facts?.map((group) => (
            <FactsGroup key={group.title} group={group} docsById={docsById} />
          ))}

          {children.length > 0 && (
            <>
              <Separator />
              <BreakdownList
                title="Breakdown"
                items={children}
                parentValue={node.value}
                onSelect={onSelectNode}
              />
            </>
          )}

          {node.altBreakdowns?.map((ab) => (
            <div key={ab.title} className="space-y-3">
              <Separator />
              <BreakdownList
                title={ab.title}
                note={ab.note}
                items={ab.items}
                parentValue={node.value}
                docsById={docsById}
                source={ab.source}
              />
            </div>
          ))}

          <Separator />
          <SourceCard source={node.source} docsById={docsById} />
        </div>
      </>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        withOverlay={false}
        className="w-full p-0 sm:max-w-[400px]"
        onInteractOutside={handleInteractOutside}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* plain scroll container — Radix ScrollArea's display:table viewport
            lets wide content escape the sheet width */}
        <div className="h-full overflow-y-auto overflow-x-hidden">{body}</div>
      </SheetContent>
    </Sheet>
  )
}
