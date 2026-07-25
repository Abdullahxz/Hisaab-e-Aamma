# Pakistan Federal Budget 2026–27, Visualised

**Where does Pakistan's money come from, and where does it go?**

Every year the federal budget is published across thousands of pages of PDFs.
The information is public — but it isn't *accessible*. Understanding something
as basic as "how much do we spend on debt interest versus schools?" means
digging through dense tables written for accountants, not citizens.

This project exists to change that. It turns the official budget documents into
an **interactive, explorable picture of the nation's finances** — built for
students, journalists, economists, and anyone who believes citizens deserve to
understand how public money is raised and spent.

**Democratising budget information. Nothing more, nothing less.**

## What you can explore

🌊 **The budget flow** — a single interactive diagram of the entire FY 2026-27
federal budget: taxes and borrowing flowing in, the constitutionally-mandated
NFC transfer to the provinces, and spending flowing out. Click any stream to
drill deeper — from *FBR Tax Revenue* all the way down to excise duty on
cement, or from *Current Expenditure* down to domestic vs foreign debt
interest.

🏛️ **Ministry by ministry** — every federal ministry and division with its
full allocation, the services it promises to deliver over a 5-year horizon,
and — for the largest ministries — each parliamentary demand broken down by
what the money actually buys: salaries, pensions, operating costs, subsidies,
assets.

📊 **Context on every number** — year-over-year change against last year's
budget and revised estimates, share of the total, and plain-language
descriptions of what each line means.

## Why you can trust the numbers

Accuracy is the entire point. This site holds itself to three rules:

1. **Every figure links to its official source.** Each number cites the exact
   document, table, and page — and links straight to the PDF on the Finance
   Division's own website (`finance.gov.pk`), opened at the cited page. You
   never have to take our word for anything.
2. **Everything must reconcile.** The budget flow balances to the rupee against
   the official *Budget at a Glance*. Breakdowns are only shown when they sum
   exactly to their published totals — figures that could not be independently
   verified are omitted and marked, never guessed.
3. **Cross-checked across documents.** Headline figures are verified across
   multiple official publications (the Budget in Brief, the Annual Budget
   Statement, the Demands for Grants) before appearing here.

All data comes from the official Federal Budget 2026-27 documents published by
the Finance Division, Government of Pakistan:
<https://www.finance.gov.pk/fb_2026_27.html>

## Running it locally

```bash
npm install
npm run dev
```

That's it — the site is fully static and works offline once loaded (source
links open the official PDFs online).

## Contributing

Found a mistake? Want to add more detail, another fiscal year, or an Urdu
translation? Contributions are very welcome — see
[CONTRIBUTING.md](CONTRIBUTING.md) for the technical documentation (data
pipeline, verification gates, and architecture).

---

*This is an independent, volunteer-built visualisation for public
understanding. It is not an official government product. All underlying data
belongs to the Government of Pakistan and is available at finance.gov.pk.*
