// Small shared presentational pieces used by the detail sheet and the
// ministry pages: YoY delta badge and source citation links/cards.
import { ArrowDownRight, ArrowUpRight, ExternalLink, Minus, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { yoyDelta } from '../lib/format.js'
import { cn } from '@/lib/utils'

const BASE = import.meta.env.BASE_URL

export function DeltaBadge({ value, prior, className }) {
  const d = yoyDelta(value, prior)
  if (!d) return null
  const Icon = d.kind === 'up' ? ArrowUpRight : d.kind === 'down' ? ArrowDownRight : d.kind === 'new' ? Sparkles : Minus
  return (
    <Badge variant="secondary" className={cn('gap-0.5 font-semibold tabular-nums', className)}>
      <Icon className="h-3 w-3" />
      {d.text}
    </Badge>
  )
}

// Citations link straight to the Finance Division's own copy of the document
// (verified byte-identical to the copies the data was extracted from, served
// inline so #page= deep links work). Falls back to a locally hosted file if a
// source ever lacks an official URL.
export function sourceHref(source, docsById) {
  const doc = docsById.get(source.docId)
  if (!doc) return null
  const base = doc.officialPdf ?? `${BASE}${doc.file}`
  return `${base}${source.page ? `#page=${source.page}` : ''}`
}

export function SourceLine({ source, docsById, className }) {
  if (!source) return null
  const doc = docsById.get(source.docId)
  if (!doc) return null
  return (
    <a
      href={sourceHref(source, docsById)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline',
        className
      )}
    >
      {doc.title.replace(' 2026-27', '')}
      {source.page ? `, p. ${source.page}` : ''}
      <ExternalLink className="h-3 w-3" />
    </a>
  )
}

export function SourceCard({ source, docsById }) {
  if (!source) return null
  const doc = docsById.get(source.docId)
  if (!doc) return null
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Source</div>
      <a
        href={sourceHref(source, docsById)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-start gap-1.5 text-sm font-medium leading-snug text-foreground underline-offset-4 hover:underline"
      >
        <span>
          {doc.title}
          {source.table ? `, ${source.table}` : ''}
          {source.page ? ` — p. ${source.page}` : ''}
        </span>
        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </a>
      <div className="mt-0.5 text-xs text-muted-foreground">{doc.publisher}</div>
    </div>
  )
}
