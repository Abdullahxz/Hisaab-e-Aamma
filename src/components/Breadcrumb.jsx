import { X, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

// Floating chips over the chart showing which categories are expanded.
export default function Breadcrumb({ data, expandedIds, onCollapseTo, onReset }) {
  const expandedList = data.nodes.filter((n) => expandedIds.has(n.id))
  return (
    <AnimatePresence>
      {expandedList.length > 0 && (
        <motion.nav
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[70%] flex-wrap items-center gap-1.5"
          aria-label="Expanded categories"
        >
          {expandedList.map((n) => (
            <motion.span
              key={n.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="pointer-events-auto inline-flex items-center gap-1 rounded-full border bg-card/90 py-0.5 pl-2.5 pr-1 text-xs font-medium shadow-sm backdrop-blur"
            >
              {n.label}
              <button
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => onCollapseTo(n.id)}
                aria-label={`Collapse ${n.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </motion.span>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="pointer-events-auto h-6 gap-1 rounded-full bg-card/90 px-2 text-xs shadow-sm backdrop-blur"
            onClick={onReset}
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
