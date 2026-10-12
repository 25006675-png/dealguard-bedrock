import type { Grade, Negotiation, Obligation, ProposedChange, ProvisionRecord } from "./types";

// Demo-mode contract breakdown for the sample deal. Fact IDs refer to the demo
// ledger in demo.ts; quotes behind them are located in the sample files.

type Data = Omit<ProvisionRecord, "provision_id" | "grade" | "rule_note">;

// For the less serious points there's no single walk-away line.
const WEIGH = "Not a walk-away point on its own. Weigh it with the others.";

const ob = (action: string, deadline: string | null, phase: Obligation["phase"]): Obligation => ({ action, deadline, phase });
const neg = (ask: string, minimum: string, walk_away: string, script: string): Negotiation => ({ ask, minimum, walk_away, script });
const chg = (clause_ref: string, replaces_fact_id: string | null, proposed_wording: string): ProposedChange => ({ clause_ref, replaces_fact_id, proposed_wording });

function p(
  ai_grade: Grade,
  headline: string,
  summary: string,
  normal: string,
  yours: string,
  fact_ids: string[],
  extra: Partial<Data> = {},
): Data {
  return {
    status: "present",
    headline,
    summary,
    ai_grade,
    why: "",
    normal,
    yours,
    cost_rm: null,
    cost_note: null,
    negotiation: null,
    change: null,
    obligations: [],
    fact_ids,
    clause_ref: extra.change?.clause_ref ?? null,
    ...extra,
  };
}

export const DEMO_PROVISIONS: Record<string, Data> = {
  parties: p("normal", "New main contractor, no track record with you", "Contoh Bina Sdn Bhd is the main contractor and Contoh Development Sdn Bhd the employer. You haven't worked with Contoh Bina before.", "Check any new main contractor before signing", "First job with Contoh Bina", ["F01"], {
    obligations: [ob("Run an SSM search, CIDB check and credit report on Contoh Bina", "before accepting the LOA", "before_signing"), ob("Ask two of their current subcontractors how they pay", null, "before_signing")],
  }),
  documents: p("unfavourable", "You'd sign a draft and a contract you haven't seen", "The subcontract conditions are a draft (Rev B), the main contract is included without being shown to you, and you must accept within 3 days.", "Final terms, all documents provided, 7–14 days to review", "Draft terms, main contract unseen, 3 days to accept", ["F34", "F35", "F36"], {
    why: "You could be bound by rules you've never read, and the draft can still change after you accept.",
    negotiation: neg("Final conditions and the main contract's payment, delay and LAD clauses, plus 14 days to review.", "The key main-contract clauses and 7 days to review.", "They refuse to show any main-contract terms.", "We're keen to proceed, but we need the final conditions and the main-contract clauses that bind us before we accept."),
    change: chg("LOA para 8", "F34", "Only the Main Contract clauses listed in the Schedule of Incorporated Terms, copies of which have been provided to the Subcontractor, shall be incorporated into the Subcontract."),
    obligations: [ob("Sign and return the LOA if you accept", "within 3 days of 2 October 2026", "before_signing"), ob("Get the main contract clauses and final conditions", "before accepting", "before_signing")],
  }),
  precedence: p("unfavourable", "They decide what the contract means", "Clause 1.3 says that if documents conflict, Contoh Bina's interpretation wins. The LOA and BQ already conflict.", "A fixed order of documents decides conflicts", "Contoh Bina's interpretation wins every conflict", ["F33"], {
    why: "Every unclear point in this package will be settled their way, including how much you get paid.",
    negotiation: neg("A fixed order: LOA, Subcontract Conditions, BQ, your quotation.", "A fixed order, even if their conditions come first.", "They insist on keeping 'Contractor's interpretation shall prevail'.", "Can we replace clause 1.3 with a fixed order of documents, so we both know how conflicts are settled?"),
    change: chg("cl. 1.3", "F33", "In the event of any conflict or discrepancy between the documents forming the Subcontract, they shall take precedence in the following order: the Letter of Award, these Subcontract Conditions, the Bills of Quantities, and the Subcontractor's quotation ref. CP/Q/0915."),
  }),
  sum_basis: p("unfavourable", "Lump sum and BQ don't match", "The LOA says RM 2,400,000 lump sum including testing. The BQ adds up to RM 2,361,600 and will be remeasured.", "One clear basis: lump sum or remeasured", "Both, RM 38,400 apart", ["F02", "F03", "F04", "F05"], {
    why: "It's unclear whether you're paid the fixed sum or the measured work, which affects every claim.",
    cost_rm: 38400,
    cost_note: "Difference between the LOA sum and BQ total",
    negotiation: neg("Confirm the work is remeasured at BQ rates, with testing paid as measured.", "A lump sum, with extra testing paid at BQ rates.", "They want a fixed sum but keep the right to remeasure down.", "Please confirm in writing whether we're paid on remeasurement at BQ rates, and how the RM 38,400 difference is treated."),
    change: chg("LOA para 1", "F02", "the Subcontract Sum of RM 2,361,600.00, subject to remeasurement of the works executed at the rates in the Bills of Quantities, with provisional items including testing valued on actual quantities"),
    obligations: [ob("Keep signed records for every pile and empty bore", "as work proceeds", "during_works")],
  }),
  scope: p("normal", "Scope is clear; platform provided by them", "Bored piling and empty bore works to their drawings, including testing. They provide access roads and the working platform; you remove spoil.", "Contractor provides access and platform", "Contractor provides access and platform", ["F23"], {
    obligations: [ob("Check the pile layout drawings against the BQ", "before accepting", "before_signing")],
  }),
  site_conditions: p("unfavourable", "You carry all the ground risk", "You're treated as having inspected the site and can't claim for unforeseen ground, obstructions or boulders.", "Obstructions paid at an agreed rate", "No claim for ground conditions or boulders", ["F22"], {
    why: "Boulders are the most common overrun on bored piling. A few days of chiselling can wipe out your margin.",
    negotiation: neg("An agreed rate for obstructions and chiselling, plus the soil investigation report.", "You absorb the first 8 hours per pile, then the rate applies.", "They refuse to share the soil report and refuse any rate.", "Without the soil report we can't price boulders. Can we agree a rate for obstructions instead?"),
    change: chg("cl. 5.2", "F22", "the Subcontractor shall be entitled to payment at the agreed daywork rate for breaking out obstructions or boulders not shown in the soil investigation report, together with a corresponding extension of time"),
    obligations: [ob("Get and read the soil investigation report", "before accepting", "before_signing"), ob("Photograph and log every obstruction and tell them in writing", null, "during_works")],
  }),
  interim_claims: p("normal", "Monthly claims, certified in 21 days", "You claim once a month and Contoh Bina has 21 days to certify each claim.", "Monthly claims, certified within 21 days", "Monthly claims, certified within 21 days", ["F09", "F10"], {
    obligations: [ob("Submit a progress claim with measurement records", "once every calendar month", "getting_paid"), ob("Chase the certificate if it hasn't arrived", "21 days after each claim", "getting_paid")],
  }),
  payment_period: p("unfavourable", "You wait up to 81 days to get paid", "Payment is due 60 days after certification, so up to 81 days after you claim. Late payment earns 5% a year.", "Paid within 30 days of certification", "Paid 60 days after certification", ["F11", "F32"], {
    why: "You fund the work for almost three months per claim. On this job that means about RM 1.9M more than you have.",
    cost_rm: 1900000,
    cost_note: "Extra cash you'd need before payments catch up",
    negotiation: neg("Payment within 30 days of certification.", "45 days, with fortnightly claims for the first two months.", "They won't move from 60 days and won't give an advance.", "We can't carry 81 days of cost on a job this size. Can we agree payment within 30 days of certification?"),
    change: chg("cl. 12.3", "F11", "Payment shall be made within thirty (30) days of certification"),
    obligations: [ob("Send a reminder and claim interest if payment is late", "60 days after certification", "getting_paid"), ob("If still unpaid, start a CIPAA payment claim", null, "getting_paid")],
  }),
  conditional_payment: p("deal_breaker", "You only get paid after they get paid", "Contoh Bina doesn't have to pay you until the employer pays them, with no end date.", "Paid on a fixed date, whatever the employer does", "Paid only when the employer pays them", ["F12"], {
    why: "If the employer pays late or never, your money is stuck too. It's void under CIPAA, but you'd have to go to adjudication to prove it.",
    cost_rm: 600000,
    cost_note: "About one monthly claim held up",
    negotiation: neg("Delete the 'until the Employer pays' condition completely.", "A fixed final date: paid within 30 days of the due date regardless.", "They insist on pay-when-paid with no final date.", "We can't carry the employer's payment risk. Please delete the pay-when-paid proviso; it's void under CIPAA anyway."),
    change: chg("cl. 12.3", "F12", "and such payment shall not be conditional upon the Contractor having received payment from the Employer"),
    obligations: [ob("If they hold back payment because the employer hasn't paid, reply in writing that this is void under CIPAA s.35", null, "getting_paid")],
  }),
  set_off: p("unfavourable", "They can deduct money from any job", "Contoh Bina can deduct anything it claims against you, under this or any other contract, with no notice.", "Deductions only for agreed amounts on this job, with notice", "Any claimed amount, any contract, no notice", ["F13"], {
    why: "A dispute on another job could wipe out a payment on this one, without warning.",
    negotiation: neg("Deductions only for certified or agreed amounts on this subcontract, with 14 days' written notice.", "This subcontract only, with 7 days' notice.", WEIGH, "Can we limit set-off to agreed amounts on this subcontract, with written notice first?"),
    change: chg("cl. 12.5", "F13", "The Contractor may deduct from sums due under this Subcontract only amounts certified or agreed as due from the Subcontractor under this Subcontract, after giving fourteen (14) days' written notice with particulars."),
  }),
  retention: p("normal", "Retention is standard; release is slow", "10% of each payment, up to 5% of the sum (RM 120,000). Half comes back at Main Contract completion, half after defects.", "10% retention, capped at 5% of the sum", "10% capped at 5%, released on the Main Contract", ["F14", "F15"], {
    obligations: [ob("Track the Main Contract completion and defects certificates and claim each release", "on issue of each certificate", "completion")],
  }),
  advance: p("unfavourable", "No advance for a costly mobilisation", "No advance payment is offered, so rig mobilisation and the first month are on you.", "10% advance against a bond on large packages", "No advance", ["F08"], {
    why: "With 81 days to first payment and no advance, your RM 300k runs out early.",
    cost_rm: 240000,
    cost_note: "A 10% advance you'd fund yourself",
    negotiation: neg("A 10% advance (RM 240,000) against an advance payment bond.", "A mobilisation payment covering prelims (RM 145,000).", "No advance and no faster payment.", "Could we agree a 10% advance against an advance payment bond, recovered from our claims?"),
    change: chg("LOA para 3", "F08", "An advance payment of ten percent (10%) of the Subcontract Sum shall be made within fourteen (14) days of receipt of an advance payment bond, recovered pro rata from interim payments."),
  }),
  variations: p("unfavourable", "Only a Director can order extra work", "A variation counts only if a Director of Contoh Bina signs it in writing.", "Site manager's written instruction, confirmed later", "Director's signature needed", ["F24"], {
    why: "Extra work ordered on site by their team may never be paid.",
    negotiation: neg("Accept written instructions from the project manager, confirmed within 7 days.", "Director confirmation within 7 days, or the instruction stands.", WEIGH, "Can site instructions from your project manager count, as long as they're confirmed within 7 days?"),
    change: chg("cl. 9.1", "F24", "No variation shall be valid unless instructed in writing by the Contractor's Project Manager or a Director of the Contractor, and any oral instruction confirmed in writing by the Subcontractor and not rejected within seven (7) days shall be deemed a valid instruction."),
    obligations: [ob("Don't start extra work without a signed written instruction", "before starting the work", "during_works")],
  }),
  variation_valuation: p("unfavourable", "Miss 14 days and you lose the claim", "Claims for extra work must be sent within 14 days or you lose them, and they set the rate for new items.", "30 days to claim, rates agreed", "14 days or lose it; they set rates", ["F25", "F26"], {
    why: "One busy fortnight on site and you lose payment for extra work you've already done.",
    negotiation: neg("30 days to claim with no loss of entitlement; new rates by agreement or cost plus 15%.", "21 days to claim; new rates by agreement.", WEIGH, "Can we extend the variation claim period to 30 days, and agree new rates together?"),
    change: chg("cl. 9.3", "F25", "Any claim for a variation shall be submitted within thirty (30) days of the instruction, and valued at the rates in the Bills of Quantities or, where none apply, at rates agreed between the parties."),
    obligations: [ob("Send each variation claim with costs and backup", "within 14 days of the instruction", "during_works")],
  }),
  completion: p("normal", "16 weeks from site possession", "Complete within 16 weeks from possession (expected 3 November 2026), following their master programme as updated.", "Fixed period from possession", "16 weeks from possession", ["F06", "F07"], {
    obligations: [ob("Confirm the actual possession date in writing", "on the day of possession", "mobilisation"), ob("Get the current master programme", "before mobilising", "mobilisation")],
  }),
  eot: p("deal_breaker", "You may get no extra time for delays you didn't cause", "Delay notices must reach them within 7 days or you lose the right to extra time, and you only get time if the employer gives them time first.", "Extra time for any delay you didn't cause", "Only if the employer grants it to them, and only with notice in 7 days", ["F19", "F20"], {
    why: "If other trades or Contoh Bina delay you, you could still pay RM 8,000 a day in penalties.",
    cost_rm: 240000,
    cost_note: "30 days of delay at the LAD rate",
    negotiation: neg("Extra time for any delay not caused by you, with 14 days to give notice.", "Time linked to the employer's decision, but always for delays Contoh Bina causes.", "Back-to-back time only, with the 7-day forfeit kept.", "We need extra time for any delay we don't cause, not only when the employer grants it to you."),
    change: chg("cl. 14.3", "F20", "The Subcontractor shall be entitled to a fair and reasonable extension of time for any delay to the Subcontract Works not caused by the Subcontractor, provided written notice is given within fourteen (14) days of the Subcontractor becoming aware of the delay."),
    obligations: [ob("Tell them in writing about every delay", "within 7 days of the delay", "during_works"), ob("Keep a daily site diary with photos of delays", "daily", "during_works")],
  }),
  lad: p("deal_breaker", "Delay penalties have no limit", "Late completion costs RM 8,000 a day with no cap, plus you cover any penalties the employer charges them.", "Capped at 10% of the sum", "RM 8,000 a day, no cap, plus their penalties", ["F17", "F18"], {
    why: "30 days late costs RM 240,000, close to your whole margin, and there's no ceiling.",
    cost_rm: 240000,
    cost_note: "30 days late at RM 8,000 a day",
    negotiation: neg("Cap all delay penalties, including the employer's, at 10% of the sum.", "A 15% cap that includes the employer's penalties.", "No cap at all.", "We can accept LAD, but it must have a cap. Can we agree 10% of the subcontract sum, including any pass-through?"),
    change: chg("cl. 15.1–15.2", "F17", "Liquidated and ascertained damages shall be RM 8,000.00 per calendar day, and the Subcontractor's total liability for delay, including any amount under clause 15.2, shall not exceed ten percent (10%) of the Subcontract Sum."),
  }),
  defects: p("normal", "24-month defects period", "Defects period of 24 months, counted from the Main Contract's completion.", "12–24 months", "24 months from Main Contract completion", ["F21"], {
    obligations: [ob("Fix defects notified during the defects period", "until 24 months after Main Contract completion", "completion")],
  }),
  bonds: p("normal", "5% bond, but it runs for years", "A 5% on-demand bank bond (RM 120,000), valid until 12 months after the Main Contract defects period.", "5% bond", "5% on-demand bond, long expiry", ["F16"], {
    obligations: [ob("Get the bank performance bond issued", "within 14 days of the LOA", "mobilisation")],
  }),
  insurance: p("normal", "They insure the works; you pay the excess", "Contoh Bina carries the works insurance, but you pay the RM 50,000 excess on claims caused by your work.", "Excess shared or passed to the party at fault", "You pay RM 50,000 per claim from your work", ["F31"], {
    obligations: [ob("Check your own insurance covers the excess, or set money aside", "before mobilising", "mobilisation")],
  }),
  termination: p("unfavourable", "They can end the job at 7 days' notice", "Contoh Bina can end your subcontract at any time with 7 days' notice, paying only for work done.", "Paid for demobilisation, materials and some profit", "Paid only for work done", ["F27"], {
    why: "You'd lose mobilisation costs, materials on order and your expected profit.",
    negotiation: neg("If ended for convenience: pay demobilisation, materials ordered and 10% of the unfinished value.", "Demobilisation and materials ordered.", WEIGH, "If you end the contract for convenience, we need our demobilisation and committed costs covered."),
    change: chg("cl. 18.1", "F27", "in which event the Subcontractor shall be paid the value of work properly executed, the cost of materials ordered, demobilisation costs and ten percent (10%) of the value of the unexecuted Subcontract Works"),
  }),
  suspension: p("unfavourable", "You can't stop work even if unpaid", "You may not stop or slow down for any reason, including not being paid.", "Can suspend after notice of non-payment", "No suspension allowed", ["F28"], {
    why: "Your main pressure when unpaid is removed. You'd keep spending money on a job that isn't paying you.",
    negotiation: neg("Allow suspension after 14 days' written notice of non-payment.", "Delete clause 19.1 and rely on your CIPAA rights.", WEIGH, "We'll keep working in good faith, but we need the right to suspend if we're not paid after notice."),
    change: chg("cl. 19.1", "F28", "If any certified amount remains unpaid fourteen (14) days after its due date, the Subcontractor may suspend the Works after giving seven (7) days' written notice, without prejudice to its rights under the Construction Industry Payment and Adjudication Act 2012."),
  }),
  disputes: p("normal", "Payment disputes can go to adjudication", "Arbitration only after the whole project finishes, but payment disputes can go to CIPAA adjudication at any time.", "Adjudication available for payment disputes", "Adjudication available; arbitration delayed", ["F29", "F30"], {
    obligations: [ob("For unpaid amounts, follow the CIPAA payment claim process", null, "getting_paid")],
  }),
};


/** Demo stand-in for /api/guide: the pre-written guide and wording for one provision. */
export function demoGuide(provisionId: string) {
  const d = DEMO_PROVISIONS[provisionId];
  return d?.negotiation && d.change ? { negotiation: d.negotiation, change: d.change } : null;
}
