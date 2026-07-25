import { BookOpen, ExternalLink, AlertCircle } from 'lucide-react'
import { OBJECT_INFO } from '../lib/objectInfo.js'
import { sourceHref } from './bits.jsx'
import { REPO_URL, REPORT_ERROR_URL } from '../lib/site.js'

// Plain-language primer + glossary. Written for a first-time reader; every
// specific figure matches the verified dataset shown elsewhere on the site.

const OBJECT_LABELS = {
  A01: 'Employees Related Expenses (salaries)',
  A02: 'Project Pre-investment Analysis',
  A03: 'Operating Expenses',
  A04: 'Employees Retirement Benefits (pensions)',
  A05: 'Grants, Subsidies & Write-off of Loans',
  A06: 'Transfers',
  A07: 'Interest Payment',
  A08: 'Loans and Advances',
  A09: 'Physical Assets',
  A10: 'Principal Repayments of Loans (refinancing)',
  A11: 'Investments',
  A12: 'Civil Works',
  A13: 'Repairs and Maintenance',
}

const DOC_ROLES = {
  bib: 'The best starting point — headline totals and all the summary tables (revenue, transfers to provinces, current expenditure, subsidies, grants, PSDP, demand-wise estimates).',
  emfr: 'Deep detail on the receipts side: every tax and non-tax revenue source, with in-year collection performance.',
  abs: 'The constitutional statement laid before the National Assembly — receipts and expenditure by function and by object, charged vs voted.',
  grants: 'Mid-year additions to the previous year\'s budget (supplementary grants).',
  mtbf: 'The "Green Book" — every ministry\'s goals, services and budgets over a rolling 3-year horizon.',
  dfg1: 'Line-item detail of every parliamentary demand: Vol-I covers current-expenditure demands 1–42.',
  dfg2: 'Line-item detail of demands 43–67 (includes Finance Division, FBR, Foreign Affairs).',
  dfg3: 'Line-item detail of demands 68–91.',
  dfg4: 'Line-item detail of development demands 92–135.',
}

const GLOSSARY = [
  ['Budget Estimate (BE)', 'The planned amount for the coming fiscal year, as approved by the National Assembly. This site shows BE 2026-27 as the primary figures.'],
  ['Revised Estimate (RE)', 'The government\'s updated mid-year expectation of what will actually be collected or spent in the current year. Comparing BE to RE shows how realistic the original plan was.'],
  ['Fiscal year', 'Pakistan\'s government year runs 1 July to 30 June. "2026-27" means July 2026 through June 2027.'],
  ['FBR', 'Federal Board of Revenue — the tax authority that collects income tax, sales tax, customs duties and federal excise.'],
  ['NFC Award', 'The National Finance Commission agreement (Article 160 of the Constitution) that fixes how tax revenue is shared between the federation and the provinces. Under the 7th Award, provinces receive 57.5% of the divisible pool.'],
  ['Divisible pool', 'The federal taxes that must be shared with provinces: income tax, sales tax, customs, most federal excise. The Petroleum Levy is NOT in the pool — one reason the federal government leans on it.'],
  ['Current expenditure', 'Day-to-day running costs: debt interest, defence, pensions, salaries, subsidies, grants. 93% of the 2026-27 federal budget.'],
  ['Development expenditure / PSDP', 'The Public Sector Development Programme — spending that builds things: dams, roads, universities. Rs 1,000 bn in 2026-27, about 5% of the budget.'],
  ['Charged vs voted', 'Charged expenditure (debt servicing, judges\' and the President\'s salaries…) is paid by constitutional obligation and is discussed but not voted by the Assembly. Voted expenditure requires Assembly approval, demand by demand.'],
  ['Demand for grants', 'The unit in which the Assembly approves spending — one "demand" per ministry/purpose (135 of them in 2026-27). Explore them on the ministry pages.'],
  ['PAO', 'Principal Accounting Officer — the secretary of a ministry/division who is personally accountable for its budget.'],
  ['Fiscal deficit', 'The gap between what the federal government spends and what it keeps in revenue — filled by borrowing. Rs 7,020 bn (3.6% of GDP) in 2026-27.'],
  ['T-bills, PIBs, Sukuk', 'The instruments the government borrows with domestically: short-term Treasury bills, longer-term Pakistan Investment Bonds, and Shariah-compliant Sukuk.'],
  ['Supplementary grant', 'Extra spending authorised during the year, beyond the passed budget — approved retrospectively by the Assembly.'],
  ['Gross vs net revenue', 'Gross revenue (Rs 20,600 bn) is everything collected; net federal revenue (Rs 11,751 bn) is what remains after the provinces\' NFC share is transferred.'],
]

function Section({ title, children }) {
  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <h3 className="text-sm font-bold">{title}</h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

export default function BasicsPage({ data, docsById }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6">
      <header>
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <BookOpen className="h-5 w-5 text-receipt" />
          Budget basics
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          A plain-language guide to reading Pakistan's federal budget — no economics degree
          required.
        </p>
      </header>

      <Section title="What is the federal budget?">
        <p>
          Every June, the government presents to the National Assembly its plan for the year
          starting 1 July: how much money it expects to raise, and how it intends to spend it. For
          2026-27 that plan totals <strong className="text-foreground">Rs 18,771 billion</strong>{' '}
          (about Rs 18.8 trillion). Once the Assembly passes it, ministries may spend against it —
          the "budget estimates" (BE) you see across this site.
        </p>
      </Section>

      <Section title="Where does the money come from?">
        <p>
          Three places. <strong className="text-foreground">Taxes</strong> (Rs 15,264 bn via FBR:
          income tax, sales tax, customs, excise);{' '}
          <strong className="text-foreground">non-tax revenue</strong> (Rs 5,336 bn: the State
          Bank's profit, the Petroleum Levy you pay at the pump, royalties, fees); and because that
          isn't enough, <strong className="text-foreground">borrowing</strong> (Rs 7,020 bn — the
          fiscal deficit).
        </p>
      </Section>

      <Section title="Why do provinces take such a big slice?">
        <p>
          The Constitution (Article 160) requires federal taxes to be shared with the provinces
          through the NFC Award. In 2026-27, <strong className="text-foreground">Rs 8,848 bn</strong>{' '}
          — 43% of gross revenue — transfers to Punjab, Sindh, KP and Balochistan before the
          federal government spends a rupee. It is the single largest flow in the budget, which is
          why the chart on the home page shows it splitting away at the top. Provinces fund
          schools, hospitals and police from this money — services the federal budget therefore
          does not show.
        </p>
      </Section>

      <Section title="Current vs development spending">
        <p>
          <strong className="text-foreground">Current expenditure</strong> (Rs 17,495 bn, 93%)
          keeps the state running: debt interest (the largest single expense at Rs 8,054 bn),
          defence, pensions, salaries, subsidies and grants.{' '}
          <strong className="text-foreground">Development spending</strong> (the PSDP plus net
          lending, Rs 1,276 bn, 7%) builds new things. When people say the budget has "no fiscal
          space", they mean the current bill leaves little for development.
        </p>
      </Section>

      <Section title="Interest vs repaying debt — don't confuse them">
        <p>
          Like a home loan, public debt has two costs: the{' '}
          <strong className="text-foreground">interest</strong> (Rs 8,054 bn — real spending that
          consumes tax revenue) and the <strong className="text-foreground">principal</strong>{' '}
          falling due (Rs 31,959 bn). The principal is not paid from taxes — the government issues
          new debt to retire old debt ("rolling over"). That's why repayments sit outside the
          Rs 18,771 bn budget and are marked "below the line" wherever they appear on this site.
        </p>
      </Section>

      <Section title="What the money buys — the object heads">
        <p>
          Accountants classify every rupee by "object" — what it purchases. These 13 heads appear
          throughout the ministry pages:
        </p>
        <dl className="mt-1 space-y-2.5">
          {Object.entries(OBJECT_LABELS).map(([code, label]) => (
            <div key={code}>
              <dt className="text-[13px] font-semibold text-foreground">
                {label} <span className="font-mono text-[10px] text-muted-foreground">{code}</span>
              </dt>
              <dd className="text-xs leading-relaxed">{OBJECT_INFO[code]}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="The documents behind this site">
        <p>Every number here traces to one of the official 2026-27 budget publications:</p>
        <ul className="mt-1 space-y-2.5">
          {data.sources.map((s) => (
            <li key={s.id}>
              <a
                href={sourceHref({ docId: s.id }, docsById)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-foreground underline-offset-4 hover:underline"
              >
                {s.title}
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
              <div className="text-xs leading-relaxed">{DOC_ROLES[s.id]}</div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Glossary">
        <dl className="space-y-2.5">
          {GLOSSARY.map(([term, def]) => (
            <div key={term}>
              <dt className="text-[13px] font-semibold text-foreground">{term}</dt>
              <dd className="text-xs leading-relaxed">{def}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* Accuracy, independence and licensing — the "how much should you trust
          this, and what may you do with it" section. */}
      <section className="rounded-xl border bg-muted/30 p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          Accuracy, independence &amp; reuse
        </h3>
        <div className="mt-2 space-y-2.5 text-xs leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-foreground">This is not an official government product.</strong>{' '}
            It is an independent, non-commercial visualisation built for public understanding. It
            carries no advertising and takes no position on whether any allocation is right or
            wrong — it reports what the published documents say.
          </p>
          <p>
            <strong className="text-foreground">Figures may contain errors.</strong> Numbers are
            transcribed and computed from official PDFs by automated parsers with reconciliation
            checks, but transcription and interpretation mistakes are always possible. Every figure
            on this site links to the exact page of the official document behind it —{' '}
            <strong className="text-foreground">
              verify against that source before relying on any number
            </strong>{' '}
            for reporting, research or any decision. No warranty of accuracy or fitness for any
            purpose is given.
          </p>
          <p>
            <strong className="text-foreground">Found a mistake?</strong> Please{' '}
            <a
              href={REPORT_ERROR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline underline-offset-2"
            >
              report it
            </a>{' '}
            — corrections are made promptly and in public.
          </p>
          <p>
            <strong className="text-foreground">Underlying data</strong> is published by the Finance
            Division, Government of Pakistan, and belongs to the Government; this site reproduces
            official figures and links to the Government's own copies of the documents rather than
            re-hosting them. <strong className="text-foreground">The software</strong> — the
            visualisation, parsers and derived datasets — is open source under the Apache-2.0
            licence and available on{' '}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline underline-offset-2"
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  )
}
