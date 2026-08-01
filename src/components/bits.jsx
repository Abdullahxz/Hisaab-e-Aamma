import * as React from 'react'
import { ArrowDownRight, ArrowUpRight, ExternalLink, Info, Minus, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { OBJECT_INFO } from '../lib/objectInfo.js'
import { yoyDelta } from '../lib/format.js'
import { trackEvent } from '../lib/usage.js'
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

// One shared openId rather than per-instance state: Radix dismisses the old
// popover from a document-level pointerdown while the new one opens from a
// click, and we don't control that order. Closing only clears the slot if the
// requester still owns it, so a late dismissal can't close the new popover.
const infoStore = {
  openId: null,
  listeners: new Set(),
  subscribe(fn) {
    infoStore.listeners.add(fn)
    return () => infoStore.listeners.delete(fn)
  },
  get: () => infoStore.openId,
  set(id) {
    if (infoStore.openId === id) return
    infoStore.openId = id
    infoStore.listeners.forEach((fn) => fn())
  },
}
let infoSeq = 0

// The ⓘ explainer shell: a label, a paragraph, and the shared-slot behaviour
// above. Renders nothing when there is no text to show.
export function InfoPopover({ label, text, trackAs }) {
  const idRef = React.useRef(null)
  if (idRef.current === null) idRef.current = `oi${++infoSeq}`
  const openId = React.useSyncExternalStore(infoStore.subscribe, infoStore.get, infoStore.get)
  const open = openId === idRef.current

  // release the slot if this instance unmounts while open (e.g. route change)
  React.useEffect(
    () => () => {
      if (infoStore.openId === idRef.current) infoStore.set(null)
    },
    []
  )

  if (!text) return null

  const handleOpenChange = (next) => {
    if (next) {
      infoStore.set(idRef.current)
      trackEvent('explainer-open', { code: trackAs ?? label })
    } else if (infoStore.openId === idRef.current) {
      infoStore.set(null) // ownership guard
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {/* No stopPropagation: React's fires at the React root, below
            `document`, swallowing the click Radix needs to dismiss. */}
        <button
          className="inline-flex shrink-0 rounded-full p-0.5 align-middle text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
          aria-label={`What is ${label}?`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="text-[13px] font-semibold">{label}</div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
      </PopoverContent>
    </Popover>
  )
}

// Object heads A01…A13, explained from the hand-written glossary.
export function ObjectInfo({ code, label }) {
  return <InfoPopover label={label} text={OBJECT_INFO[code]} trackAs={code} />
}

// source.page is the document's PRINTED page number (what we display), but
// #page= targets the physical PDF page — doc.pageOffset bridges the front
// matter. Links go to the Finance Division's own copy.
export function sourceHref(source, docsById) {
  const doc = docsById.get(source.docId)
  if (!doc) return null
  const base = doc.officialPdf ?? `${BASE}${doc.file}`
  const pdfPage = source.page ? source.page + (doc.pageOffset ?? 0) : null
  return `${base}${pdfPage ? `#page=${pdfPage}` : ''}`
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
      onClick={() => trackEvent('source-open', { doc: source.docId, page: source.page })}
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
        onClick={() => trackEvent('source-open', { doc: source.docId, page: source.page })}
        className="mt-1 inline-flex items-start gap-1.5 text-sm font-medium leading-snug text-foreground underline-offset-4 hover:underline"
      >
        <span>
          {doc.title}
          {source.table ? `, ${source.table}` : ''}
          {source.page ? `, p. ${source.page}` : ''}
        </span>
        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </a>
      <div className="mt-0.5 text-xs text-muted-foreground">{doc.publisher}</div>
    </div>
  )
}
