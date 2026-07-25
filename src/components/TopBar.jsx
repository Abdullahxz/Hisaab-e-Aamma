import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatPKR } from '../lib/format.js'
import { LEGEND_ROLES, ROLE_LABELS } from '../lib/palette.js'

const ROLE_BG = {
  receipt: 'bg-receipt',
  expenditure: 'bg-expenditure',
  transfer: 'bg-transfer',
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-bold tabular-nums">{value}</span>
    </div>
  )
}

function NavTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
        active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

export default function TopBar({ meta, mode, onToggleMode, route, onNavigate, hasMinistries }) {
  const onFlow = route?.page === 'flow'
  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b bg-card/60 px-4 py-2.5 backdrop-blur sm:px-6">
      <div className="flex items-baseline gap-2">
        <h1 className="text-base font-bold tracking-tight sm:text-lg">
          Pakistan Federal Budget
        </h1>
        <span className="rounded-md bg-receipt/15 px-1.5 py-0.5 text-sm font-bold text-receipt">
          {meta.fiscalYear}
        </span>
      </div>

      <nav className="flex items-center gap-1" aria-label="Views">
        <NavTab active={onFlow} onClick={() => onNavigate('#/')}>
          Budget flow
        </NavTab>
        {hasMinistries && (
          <NavTab active={!onFlow} onClick={() => onNavigate('#/ministries')}>
            Ministries
          </NavTab>
        )}
      </nav>

      <Separator orientation="vertical" className="hidden h-8 lg:block" />

      <div className="hidden items-center gap-5 lg:flex">
        <Stat label="Total outlay" value={formatPKR(meta.totalOutlay)} />
        <Stat label="Gross revenue" value={formatPKR(meta.grossRevenue)} />
        <Stat label="To provinces (NFC)" value={formatPKR(meta.provincialTransfer)} />
      </div>

      <div className="ml-auto flex items-center gap-4">
        {onFlow && (
          <div className="hidden items-center gap-3 xl:flex" role="list" aria-label="Legend">
            {LEGEND_ROLES.map((role) => (
              <span key={role} role="listitem" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`h-2.5 w-2.5 rounded-sm ${ROLE_BG[role]}`} />
                {ROLE_LABELS[role]}
              </span>
            ))}
          </div>
        )}
        <Button variant="ghost" size="iconSm" onClick={onToggleMode} aria-label="Toggle light / dark theme">
          {mode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  )
}
