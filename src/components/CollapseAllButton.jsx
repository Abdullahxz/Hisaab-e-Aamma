import { motion, AnimatePresence } from 'framer-motion'
import { Shrink } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Floats in the chart's empty top-left corner, where the breadcrumb chips used
// to sit. One expanded category is trivially closed from its own sheet, so this
// only appears once the chart is genuinely drilled into, and fades out again
// the moment it is collapsed.
export default function CollapseAllButton({ show, onCollapseAll }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="absolute left-3 top-3 z-10"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={onCollapseAll}
            className="rounded-full bg-card/90 shadow-sm backdrop-blur"
          >
            <Shrink className="h-3.5 w-3.5" />
            Collapse all
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
