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
  bib: 'The best starting point, with headline totals and all the summary tables (revenue, transfers to provinces, current expenditure, subsidies, grants, PSDP, demand-wise estimates).',
  emfr: 'Deep detail on the receipts side: every tax and non-tax revenue source, with in-year collection performance.',
  abs: 'The constitutional statement laid before the National Assembly, setting out receipts and expenditure by function and by object, charged vs voted.',
  grants: 'Mid-year additions to the previous year\'s budget (supplementary grants).',
  mtbf: 'The "Green Book", with every ministry\'s goals, services and budgets over a rolling 3-year horizon.',
  dfg1: 'Line-item detail of every parliamentary demand: Vol-I covers current-expenditure demands 1–42.',
  dfg2: 'Line-item detail of demands 43–67 (includes Finance Division, FBR, Foreign Affairs).',
  dfg3: 'Line-item detail of demands 68–91.',
  dfg4: 'Line-item detail of development demands 92–135.',
}

const GLOSSARY = [
  ['Budget Estimate (BE)', 'The planned amount for the coming fiscal year, as approved by the National Assembly. This site shows BE 2026-27 as the primary figures.'],
  ['Revised Estimate (RE)', 'The government\'s updated mid-year expectation of what will actually be collected or spent in the current year. Comparing BE to RE shows how realistic the original plan was.'],
  ['Fiscal year', 'Pakistan\'s government year runs 1 July to 30 June. "2026-27" means July 2026 through June 2027.'],
  ['FBR', 'Federal Board of Revenue, the tax authority that collects income tax, sales tax, customs duties and federal excise.'],
  ['NFC Award', 'The National Finance Commission agreement (Article 160 of the Constitution) that fixes how tax revenue is shared between the federation and the provinces. Under the 7th Award, provinces receive 57.5% of the divisible pool.'],
  ['Divisible pool', 'The federal taxes that must be shared with provinces: income tax, sales tax, customs, most federal excise. The Petroleum Levy is NOT in the pool, one reason the federal government leans on it.'],
  ['Current expenditure', 'Day-to-day running costs: debt interest, defence, pensions, salaries, subsidies, grants. 93% of the 2026-27 federal budget.'],
  ['Development expenditure / PSDP', 'The Public Sector Development Programme, spending that builds things: dams, roads, universities. The federal PSDP is Rs 1,000 bn in 2026-27, about 5% of the federal budget. It is not all the development spending in the country: each province funds its own ADP separately.'],
  ['ADP (Annual Development Programme)', 'A province\'s own development budget, the provincial equivalent of the federal PSDP, passed by that province\'s assembly and funded mainly from its NFC share. Provincial ADPs are not part of the federal budget and do not appear anywhere on this site.'],
  ['18th Amendment', 'The 2010 constitutional amendment that devolved most service delivery to the provinces, including schools, hospitals, agriculture and local roads, along with a larger share of the divisible pool. It is the reason the federal budget shows so little education and health spending: those are now mostly provincial subjects.'],
  ['Charged vs voted', 'Charged expenditure (debt servicing, judges\' and the President\'s salaries…) is paid by constitutional obligation and is discussed but not voted by the Assembly. Voted expenditure requires Assembly approval, demand by demand.'],
  ['Demand for grants', 'The unit in which the Assembly approves spending, one "demand" per ministry/purpose (135 of them in 2026-27). Explore them on the ministry pages.'],
  ['PAO', 'Principal Accounting Officer, the secretary of a ministry/division who is personally accountable for its budget.'],
  ['Fiscal deficit', 'The gap between what a government spends and what it raises, filled by borrowing. Two different figures carry this name in 2026-27. The federal deficit is Rs 7,020 bn, the gap this budget fills by borrowing. The overall fiscal deficit is Rs 5,226 bn, or 3.6% of GDP: the federal deficit after netting off the Rs 1,794 bn surplus the four provinces are projected to run between them. A percentage of GDP quoted in the news is almost always the second one.'],
  ['T-bills, PIBs, Sukuk', 'The instruments the government borrows with domestically: short-term Treasury bills, longer-term Pakistan Investment Bonds, and Shariah-compliant Sukuk.'],
  ['Supplementary grant', 'Extra spending authorised during the year, beyond the passed budget, approved retrospectively by the Assembly.'],
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
          A plain-language guide to reading Pakistan's federal budget. No economics degree
          required.
        </p>
      </header>

      <Section title="What is the federal budget?">
        <p>
          Every June, the government presents to the National Assembly its plan for the year
          starting 1 July: how much money it expects to raise, and how it intends to spend it. For
          2026-27 that plan totals Rs 18,771 billion (about Rs 18.8 trillion). Once the Assembly
          passes it, ministries may spend against it.
        </p>
      </Section>

      <Section title="What this budget leaves out">
        <p>
          This is the budget of the federal government only. Punjab, Sindh, Khyber Pakhtunkhwa and
          Balochistan each pass a budget of their own, funded mainly by the NFC transfer you can
          watch leaving the chart. Since the 18th Amendment most of the services people actually
          meet are provincial subjects, paid for out of those provincial budgets: government
          schools, hospitals and basic health units, police, local roads, agriculture.
        </p>
        <p>
          The figures shown here represent only the federal government's share of spending. In education and health,
          this includes the Higher Education Commission, federal institutions, Islamabad, and the special areas.
          Provincial spending is not included, so the numbers on this site should not be read as Pakistan's total
          expenditure on provincial subjects.
        </p>
      </Section>

      <Section title="Where does the money come from?">
        <p>
          Three places. Taxes (Rs 15,264 bn via FBR: income tax, sales tax, customs, excise);
          non-tax revenue (Rs 5,336 bn: the State Bank's profit, the Petroleum Levy you pay at the
          pump, royalties, fees); and because that isn't enough, borrowing (Rs 7,020 bn, the federal
          deficit).
        </p>
      </Section>

      <Section title="Why do provinces take such a big slice?">
        <p>
          The Constitution (Article 160) requires federal taxes to be shared with the provinces
          through the NFC Award. In 2026-27, Rs 8,848 bn, 43% of gross revenue, transfers to
          Punjab, Sindh, KP and Balochistan before the federal government spends a rupee. It is the
          single largest flow in the budget. Provinces fund schools, hospitals and police from this money,
          so those are services the federal budget does not show.
        </p>
      </Section>

      <Section title="Current vs development spending">
        <p>
          Current expenditure (Rs 17,495 bn, 93%) keeps the state running: debt interest (the
          largest single expense at Rs 8,054 bn), defence, pensions, salaries, subsidies and
          grants. Development spending (the PSDP plus net lending, Rs 1,276 bn, 7%) builds new
          things. When people say the budget has "no fiscal space", they mean the current bill
          leaves little for development.
        </p>
        <p>
          The federal PSDP is not the whole development story, though. Each province funds its own
          Annual Development Programme from its NFC share, and state-owned enterprises and
          public-private partnerships invest outside the budget altogether. A project missing from
          the PSDP has not necessarily gone unfunded; it may simply be someone else's line item.
        </p>
      </Section>

      <Section title="Don't confuse interest with repaying debt">
        <p>
          Like a home loan, public debt has two costs: the interest (Rs 8,054 bn, real spending
          that consumes tax revenue) and the principal falling due (Rs 31,959 bn). The principal is
          not paid from taxes; the government issues new debt to retire old debt (rolling over).
        </p>
      </Section>

      <Section title="What the money buys, head by head">
        <p>
          Accountants classify every rupee by "object", meaning what it purchases. These 13 heads
          appear throughout the ministry pages:
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
            This is not an official government product. It is an independent, non-commercial
            visualisation built for public understanding. It carries no advertising and takes no
            position on whether any allocation is right or wrong; it reports what the published
            documents say.
          </p>
          <p>
            Figures may contain errors. Numbers are transcribed and computed from official PDFs by
            automated parsers with reconciliation checks, but transcription and interpretation
            mistakes are always possible. Every figure on this site links to the exact page of the
            official document behind it; verify against that source before relying on any number
            for reporting, research or any decision. No warranty of accuracy or fitness for any
            purpose is given.
          </p>
          <p>
            Found a mistake? Please{' '}
            <a
              href={REPORT_ERROR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline underline-offset-2"
            >
              report it
            </a>
            ; corrections are made promptly and in public.
          </p>
          <p>
            Underlying data is published by the Finance Division, Government of Pakistan, and
            belongs to the Government; this site reproduces official figures and links to the
            Government's own copies of the documents rather than re-hosting them. The software,
            meaning the visualisation, parsers and derived datasets, is open source under the
            Apache-2.0 licence and available on{' '}
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
