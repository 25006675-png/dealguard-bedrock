import type { DraftKind } from "./prompts";

// Demo-mode drafts for the sample deal. Real drafts are generated from the analysis.
export const DEMO_DRAFTS: Record<DraftKind, string> = {
  notice_templates: `## 1. Notice of delay event (extension of time)

**Send within 7 days of the delay event (cl. 14.2).** Notice is a condition precedent: if it is late, you lose the right to an extension and are exposed to LAD of RM 8,000 per day.

> To: Contoh Bina Sdn Bhd — Attn: Project Manager
> Date: [date]
> Ref: Package P2 Bored Piling — Notice of Delay No. [__]
>
> Pursuant to Clause 14.2 of the Subcontract Conditions, we give notice of the following delay event:
>
> - **Event:** [describe, e.g. working platform not ready at grid lines A–D]
> - **Date it began:** [date]
> - **Cause:** [cause, and why it is not our responsibility]
> - **Effect on our works:** [activities affected, estimated delay in days]
>
> We will provide further particulars as the effect becomes clear, and we reserve our right to an extension of time and to recover associated costs.
>
> [Name, designation], for Contoh Piling Sdn Bhd

## 2. Variation confirmation and claim cover letter

**Send within 14 days of the instruction (cl. 9.3), or the claim is deemed waived.** Variations are only valid if signed by a Director of Contoh Bina (cl. 9.1), so confirm any site instruction in writing first.

> To: Contoh Bina Sdn Bhd — Attn: [Director]
> Date: [date]
> Ref: Package P2 — Variation Claim No. [__]
>
> We refer to the instruction given by [name] on [date] to [describe the work]. Under Clause 9.1 we ask that you confirm this instruction in writing, signed by a Director.
>
> Under Clause 9.3 we submit our claim for this variation:
>
> | Item | Description | Qty | Rate (RM) | Amount (RM) |
> |---|---|---|---|---|
> | [ ] | [ ] | [ ] | [BQ rate or build-up] | [ ] |
>
> Supporting records attached: [daywork sheets, photos, measurement records].
>
> [Name, designation], for Contoh Piling Sdn Bhd

## 3. Payment reminder (before a CIPAA payment claim)

**Send when payment is overdue (60 days after certification, cl. 12.3).** Late certified amounts earn 5% per annum (cl. 23.1).

> We refer to Payment Certificate No. [__] dated [date] for RM [amount], which fell due on [date] and remains unpaid. Please arrange payment within 7 days, together with interest at 5% per annum under Clause 23.1. Payment cannot be conditional on payment by the Employer, as such terms are void under section 35 of CIPAA 2012. If payment is not received, we will serve a payment claim under CIPAA 2012.
`,

  financing_pack: `# Working-capital financing summary

**Applicant:** Contoh Piling Sdn Bhd (CIDB Grade G5 piling subcontractor, Selangor)
**Purpose:** working capital for Package P2 bored piling works

## Project and package
- **Project:** Cadangan Pembangunan Residensi Contoh, Seksyen 13, Shah Alam (private residential development)
- **Employer:** Contoh Development Sdn Bhd · **Main contractor:** Contoh Bina Sdn Bhd
- **Package:** bored piling and empty bore works, 16 weeks from site possession (expected 3 November 2026)

## Contract value and payment terms
- **Subcontract sum:** RM 2,400,000 (lump sum per LOA; BQ remeasurable at RM 2,361,600, under clarification)
- **Progress claims:** monthly, certified within 21 days, paid 60 days after certification
- **Retention:** 10% per payment, limited to 5% (RM 120,000)
- **Advance payment:** none currently offered (10% requested)

## Funding requirement
- **Peak funding need:** about RM 2.2M around weeks 15–16, before the first progress payment is received
- **Own funds available:** RM 300,000
- **Shortfall:** about RM 1.9M on contract terms; higher if payments are 30 days late
- **Duration of need:** until progress payments catch up, around weeks 24–28

## Key risks and mitigations being negotiated
- Payment conditional on the employer paying the main contractor (void under CIPAA s.35) → deletion requested
- 60-day payment period → 30 days requested; 10% advance requested
- Uncapped LAD of RM 8,000/day → cap at 10% requested
- Ground-condition risk → obstruction rate requested; soil investigation report requested

## Security that could be offered
- Assignment of progress payments under the subcontract, subject to main contractor consent
- [Existing fixed deposit / directors' guarantee — to be confirmed]

*Figures come from DealGuard's analysis of the draft documents and will change once terms are agreed.*
`,
};
