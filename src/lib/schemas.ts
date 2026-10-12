import { z } from "zod";

// Tool input schemas. Bedrock's Messages endpoint does not offer structured
// outputs, so each agent reports through a tool call that we validate here.

const num = (d: string) => z.number().nullable().describe(d);

export const keyTermsSchema = z.object({
  contract_sum_rm: num("Subcontract sum in RM, or null if not stated"),
  completion_weeks: num("Subcontract duration in weeks, or null"),
  claim_interval_days: num("Days between progress claims (e.g. 30 for monthly), or null"),
  certification_days: num("Days the contractor has to certify/assess a claim, or null"),
  payment_due_days: num("Days after certification that payment is due, or null"),
  retention_pct: num("Retention deducted from each payment, % of value, or null"),
  retention_cap_pct: num("Retention limit as % of subcontract sum, or null"),
  advance_payment_pct: num("Advance payment offered as % of subcontract sum, or null"),
  lad_per_day_rm: num("Liquidated damages in RM per day, or null"),
  lad_cap_pct: num("LAD cap as % of subcontract sum, or null if uncapped or not stated"),
  dlp_months: num("Defects liability period in months, or null"),
  performance_bond_pct: num("Performance bond as % of subcontract sum, or null"),
  pay_when_paid: z.boolean().nullable().describe("True if payment depends on the contractor being paid by the employer"),
});

export const intakeSchema = z.object({
  documents: z
    .array(
      z.object({
        name: z.string().describe("File name exactly as provided"),
        doc_type: z.string().describe("e.g. Letter of Award, Subcontract Conditions, Bill of Quantities, Quotation, Programme, Drawing, Correspondence"),
        status: z.enum(["signed", "draft", "unclear"]),
        summary: z.string().describe("One sentence on what this document governs"),
      }),
    )
    .describe("One entry per uploaded document"),
  missing_documents: z
    .array(z.object({ name: z.string(), why: z.string() }))
    .describe("Documents referenced or normally expected but not provided (e.g. main contract, specification, programme)"),
  precedence_note: z.string().describe("What the documents say about order of precedence, or that none is stated"),
  terms: keyTermsSchema,
});

const obligation = z.object({
  action: z.string().describe("What the subcontractor must do, in plain words, e.g. 'Tell Contoh Bina in writing about the delay'"),
  deadline: z.string().nullable().describe("When, as the contract states it, e.g. 'within 7 days of the delay'; null if no deadline"),
  phase: z.enum(["before_signing", "mobilisation", "during_works", "getting_paid", "completion"]),
});

const grade = z.enum(["normal", "unfavourable", "deal_breaker"]);

export const specialistSchema = z.object({
  summary: z.string().describe("One or two plain sentences: the overall position in this area"),
  provisions: z
    .array(
      z.object({
        provision_id: z.string().describe("One of the provision IDs assigned to you"),
        status: z.enum(["present", "missing", "unclear"]),
        headline: z.string().describe("The point in everyday words, max 10 words, e.g. 'You only get paid after they get paid'"),
        summary: z.string().describe("What the documents say, max 40 words, plain English, with the key figures"),
        grade: grade.describe("normal = usual market practice; unfavourable = worse than normal, worth negotiating; deal_breaker = should not be signed as written (rare: usually 0-3 per contract)"),
        why: z.string().describe("Why it matters to the subcontractor, max 30 words, everyday language, no legal jargon. Empty string if normal"),
        normal: z.string().describe("What is normal in Malaysian subcontracts, max 15 words, e.g. 'Paid within 30 days of your claim'"),
        yours: z.string().describe("What this contract says, max 15 words, e.g. 'Paid up to 81 days after you claim'"),
        cost_rm: z.number().nullable().describe("Rough RM the subcontractor could lose or have to fund because of this term, or null"),
        cost_note: z.string().nullable().describe("How cost_rm is worked out, max 15 words"),
        clause_ref: z.string().nullable().describe("Where this is in the documents, e.g. 'cl. 12.3' or 'LOA para 7'; null if not covered"),
        obligations: z.array(obligation).describe("At most 3 concrete steps the subcontractor must take under this provision"),
        fact_ids: z.array(z.string()).describe("Fact ledger IDs that evidence this provision"),
      }),
    )
    .describe("Exactly one record for every provision assigned to you, in the order given"),
  protections: z
    .array(
      z.object({
        title: z.string(),
        explanation: z.string().describe("Max 25 words"),
        fact_ids: z.array(z.string()),
      }),
    )
    .describe("Terms in this area that already protect the subcontractor"),
});

// Generated on demand, one provision at a time, when the user opens a guide or ticks a point.
export const guideSchema = z.object({
  negotiation: z.object({
    ask: z.string().describe("The request itself, max 25 words, worded so it can go straight into a letter to the main contractor, e.g. 'Payment within 30 days of certification'"),
    minimum: z.string().describe("The least the subcontractor should accept, max 25 words"),
    walk_away: z.string().describe("When to walk away rather than sign, max 20 words; or say it isn't a walk-away point on its own"),
    script: z.string().describe("One polite, firm sentence the owner can say to the main contractor"),
  }),
  change: z.object({
    clause_ref: z.string().nullable().describe("e.g. 'cl. 12.3' or 'LOA para 7'"),
    replaces_fact_id: z.string().nullable().describe("The evidence fact ID whose quoted wording this change replaces; null for a new clause"),
    proposed_wording: z.string().describe("Replacement clause wording in contract style, max 70 words, that fits into the contract in place of the quoted wording"),
  }),
});

export const decisionSchema = z.object({
  verdict: z.enum(["proceed", "proceed_with_conditions", "negotiate_before_signing", "do_not_sign_yet"]),
  headline: z.string().describe("One plain sentence the SME owner should read first, max 30 words"),
  summary: z.string().describe("Two or three plain sentences explaining the verdict, max 70 words"),
  focus: z.array(z.string()).describe("Provision IDs the subcontractor should push on, most important first, max 5, considering their likely leverage"),
  missing_evidence: z
    .array(
      z.object({
        item: z.string(),
        why: z.string(),
        ask_from: z.string().describe("Who to request it from"),
        timing: z.enum(["before_signing", "before_mobilisation", "during_works"]),
      }),
    )
    .describe("Documents or clarifications to obtain"),
  confidence: z.object({
    level: z.enum(["high", "medium", "low"]),
    reasons: z.array(z.string()).describe("What raises or lowers confidence in this assessment"),
  }),
});

export type IntakeOutput = z.infer<typeof intakeSchema>;
export type SpecialistOutput = z.infer<typeof specialistSchema>;
export type DecisionOutput = z.infer<typeof decisionSchema>;
export type GuideOutput = z.infer<typeof guideSchema>;

export function toInputSchema(schema: z.ZodType) {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json as { type: "object"; [k: string]: unknown };
}
