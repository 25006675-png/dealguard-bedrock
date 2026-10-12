# DealGuard MY

Commercial decision support for Malaysian SME construction subcontractors. Upload a Letter of Award, subcontract conditions and BQ. DealGuard reviews payment, scope, time, remedies and document consistency, and tells you whether to sign, what to negotiate and what to ask for, with the exact clause behind every point.

Track: Financial Inclusion & SME Empowerment. Built on **Claude Sonnet 5.5 on Amazon Bedrock**. Commercial guidance only, not legal advice.

## Run it

```powershell
npm install
npm run dev          # http://localhost:3000, starts in demo mode
```

`/` is the landing page; `/app` is the product (`/app?sample=1` preloads the sample deal).

Demo mode replays a sample analysis of the fictional deal in `public/sample-deal/`. To analyse real documents, follow **[BEDROCK_SETUP.md](BEDROCK_SETUP.md)**.

## What changed from the PartyRock version

| PartyRock | Bedrock version |
|---|---|
| 15 text widgets on one long page | Guided flow: setup → live pipeline → decision dashboard with 5 tabs |
| Risk score written by the model | Deterministic 100-point score from finding severities, with the formula shown |
| Funding "calculator" written by the model | Week-by-week cash model from the extracted payment terms, with a 30-days-late stress line |
| Free-text outputs | Every agent returns validated, schema-checked data that drives charts |
| No way to check a claim | **Click-to-source evidence**: every finding links to the verified quote and page, and the PDF opens at that page |
| Static connection graph | Live 3D pipeline that lights up as each agent runs |
| Chat | Advisor chat that cites clickable fact and finding IDs |

## How it works

```
Deal inputs + documents
   ├─ Document Intake & Key Terms      (Claude, tool output)       ┐ run in parallel
   └─ Contract Fact Ledger             (Claude, citations on)       ┘
        ├─ Payment & Certification   ┐
        ├─ Scope, BQ & Variations    │
        ├─ Time, EOT & LAD           │ 5 specialists in parallel, sharing
        ├─ Termination & Remedies    │ the cached document prefix
        └─ Consistency & Counterparty┘
             ├─ Risk scoring           (code)
             └─ Funding exposure       (code)
                  └─ Decision & Negotiation Strategist (Claude)
                       └─ Advisor chat (Claude, streaming)
```

- **Evidence you can verify.** The fact ledger runs with Claude citations, so each quote is returned by the API from your documents, not paraphrased by the model. Specialists cite fact IDs; the UI resolves them to quote, document and page.
- **Structured output on Bedrock.** Structured outputs aren't available on Bedrock's Messages endpoint, so each agent reports through a tool call that is validated with Zod and retried once on failure (`src/lib/bedrock.ts`).
- **Prompt caching.** Intake and the specialists share the system prompt, tools and document prefix, so intake writes the cache and the five specialists read it.
- **Fail fast.** If intake and the fact ledger both fail (usually credentials or model access), the run stops before spending more calls.

## Project map

| Path | What |
|---|---|
| `src/lib/pipeline.ts` | Orchestration of the agents |
| `src/lib/provisions.ts` | The 23-provision contract breakdown (review with a QS before relying on it) |
| `src/lib/playbook.ts` | Red lines and CIPAA 2012 benchmark checks, in code |
| `src/lib/prompts.ts`, `src/lib/schemas.ts` | Agent and drafting prompts, output schemas |
| `src/lib/ledger.ts` | Turns citations into the fact ledger |
| `src/lib/scoring.ts`, `src/lib/funding.ts` | Deterministic score and cash model |
| `src/lib/bedrock.ts` | Bedrock client, tool-call validation and retry |
| `src/lib/demo.ts` | Demo-mode replay |
| `src/app/api/*` | `analyze` (NDJSON stream), `chat` and `draft` (text streams), `health` (`?ping=1` tests Bedrock) |
| `src/components/results/` | Dashboard tabs: overview, contract breakdown, deadlines, cash flow, negotiate, sources, method |
| `src/components/landing/` | Landing page, X-ray lens, scroll-drawn cash curve, pipeline demo |
| `src/components/` | Setup, 3D pipeline, evidence drawer, chat |
