import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Milliseconds the nudge stays up before removing itself.
const VISIBLE_MS = 5000

// A one-off offer of the glossary, shown once the data is up. It is dismissable
// and disappears on its own, so a reader who already knows the vocabulary is
// never blocked, and the chart stays interactive behind it.
//
// The countdown pauses while the pointer (or keyboard focus) is on the card:
// someone still reading it should not have it vanish mid-sentence. What is left
// of the five seconds resumes when they move away.
export default function GlossaryPrompt({ open, onDismiss, onOpenGlossary }) {
  const [paused, setPaused] = useState(false)
  const [remaining, setRemaining] = useState(VISIBLE_MS)
  const startedAt = useRef(0)

  useEffect(() => {
    if (!open || paused || remaining <= 0) return
    startedAt.current = Date.now()
    // 'expired' vs the button's 'dismissed': ignored and rejected are different
    // answers to "is this prompt worth showing?"
    const timer = setTimeout(() => onDismiss('expired'), remaining)
    return () => {
      clearTimeout(timer)
      // banked on pause; harmless on dismissal, the card is gone either way
      setRemaining((left) => Math.max(0, left - (Date.now() - startedAt.current)))
    }
  }, [open, paused, remaining, onDismiss])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label="Help with budget terminology"
          // x is animated rather than set with -translate-x-1/2: framer writes
          // `transform` inline, which would drop the Tailwind translate.
          initial={{ opacity: 0, x: '-50%', y: 16 }}
          animate={{ opacity: 1, x: '-50%', y: 0 }}
          exit={{ opacity: 0, x: '-50%', y: 16 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="fixed bottom-10 left-1/2 z-[70] w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-card shadow-2xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className="flex gap-3 p-4">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-receipt" />
            <div>
              <div className="text-sm font-bold">New to budget terminology?</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Divisible pool, NFC award, current versus development spending. The glossary
                explains every term on this site in plain language.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={onOpenGlossary}>
                  Open the glossary
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDismiss('dismissed')}>
                  No thanks
                </Button>
              </div>
            </div>
          </div>
          {/* counts down the automatic dismissal so it doesn't vanish unexplained;
              holds still while the card is hovered or focused */}
          <motion.div
            className="h-0.5 origin-left bg-receipt/60"
            initial={{ scaleX: 1 }}
            animate={{ scaleX: paused ? remaining / VISIBLE_MS : 0 }}
            transition={{ duration: paused ? 0 : remaining / 1000, ease: 'linear' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
