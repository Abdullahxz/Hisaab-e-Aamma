import { formatCompact, formatPct } from '../lib/format.js'

export default function ChartTooltip({ hover }) {
  if (!hover) return null
  const flip = hover.x > window.innerWidth - 240
  return (
    <div
      role="status"
      className="pointer-events-none fixed z-[60] max-w-[230px] rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-lg"
      style={{
        left: hover.x + (flip ? -12 : 14),
        top: hover.y + 14,
        transform: flip ? 'translateX(-100%)' : 'none',
      }}
    >
      <div className="text-[13px] font-semibold leading-snug">{hover.label}</div>
      <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
        {formatCompact(hover.value)} · {formatPct(hover.pct)} {hover.pctShort}
      </div>
      {hover.kind === 'node' && hover.hasChildren && (
        <div className="mt-1 text-[11px] text-muted-foreground/80">
          Click to {hover.expanded ? 'see details' : 'expand'}
        </div>
      )}
    </div>
  )
}
