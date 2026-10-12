import { readFile } from "node:fs/promises";
import path from "node:path";
import { DEMO_PROVISIONS } from "./demo-provisions";
import { computeFunding } from "./funding";
import { checkPlaybook } from "./playbook";
import { provisionsFor } from "./provisions";
import { SAMPLE_FILES, SAMPLE_TERMS } from "./sample";
import { applyFloor, dealCheck, deriveFindings } from "./rubric";
import type {
  AgentId,
  Analysis,
  DealInput,
  Decision,
  DocMeta,
  Fact,
  Gap,
  Intake,
  PipelineEvent,
  SpecialistReview,
} from "./types";

// Demo mode replays a pre-built analysis of the sample deal in public/sample-deal,
// so the whole UI can be explored before Bedrock is connected. Quotes are located
// in the sample files at runtime, exactly as citations would be.

const [LOA, SC, BQ] = [0, 1, 2];

const FACTS: [string, string, number, string | string[]][] = [
  ["parties", "Main contractor is Contoh Bina Sdn Bhd; the employer is Contoh Development Sdn Bhd.", LOA, "EMPLOYER: CONTOH DEVELOPMENT SDN BHD"],
  ["value", "Awarded as a lump sum of RM 2,400,000, inclusive of preliminaries, attendance and testing.", LOA, "for the lump sum of RM 2,400,000.00 (Ringgit Malaysia Two Million Four Hundred Thousand Only), inclusive of all preliminaries, attendance and testing"],
  ["bq", "The BQ total carried to tender is RM 2,361,600.", BQ, "TOTAL CARRIED TO FORM OF TENDER,,,,2361600"],
  ["bq", "BQ quantities are provisional and subject to remeasurement on completion.", BQ, "Quantities are provisional and subject to remeasurement on completion."],
  ["bq", "Load tests (RM 76,000) and integrity tests (RM 42,000) are provisional BQ items.", BQ, ["C1,Maintained load test (Provisional),nr,2,38000,76000", "C2,Pile integrity test (Provisional),nr,140,300,42000"]],
  ["time", "Completion within 16 weeks of site possession, expected 3 November 2026.", LOA, "completed within sixteen (16) weeks from the date of site possession, which is expected on 3 November 2026"],
  ["time", "Works must follow the contractor's master programme as updated from time to time.", SC, "The Subcontractor shall execute the Works in accordance with the Contractor's master programme as updated from time to time."],
  ["advance", "No advance payment is offered.", LOA, "No advance payment shall be made under this Subcontract."],
  ["payment", "Progress claims can be submitted once a month.", SC, "The Subcontractor may submit a progress claim once every calendar month."],
  ["payment", "The contractor has 21 days to assess and certify a claim.", SC, "The Contractor shall assess and certify the claim within twenty-one (21) days of receipt."],
  ["payment", "Payment is due 60 days after certification.", SC, "Payment shall be made within sixty (60) days of certification"],
  ["payment", "Payment is conditional on the contractor being paid by the employer (pay-when-paid).", SC, "the Contractor shall not be obliged to pay any amount until and unless the Contractor has received payment of the corresponding amount from the Employer"],
  ["setoff", "The contractor may set off any amount it claims under this or any other contract between the parties.", SC, "The Contractor may deduct or set off from any sum due to the Subcontractor any amount claimed by the Contractor under this Subcontract or any other contract between the parties."],
  ["retention", "Retention is 10% of each payment, limited to 5% of the subcontract sum.", LOA, "Retention of ten percent (10%) of the value of work done shall be deducted from each interim payment up to a limit of five percent (5%) of the Subcontract Sum."],
  ["retention", "Retention is released half at the Main Contract CPC and half at the Main Contract CMGD.", SC, "Half of the retention shall be released upon the issue of the Certificate of Practical Completion for the Main Contract Works, and the balance upon the issue of the Certificate of Making Good Defects under the Main Contract."],
  ["security", "A 5% unconditional on-demand bond is required, valid until 12 months after the Main Contract defects period.", LOA, ["unconditional on-demand performance bond for five percent (5%) of the Subcontract Sum", "valid until twelve (12) months after the expiry of the Defects Liability Period of the Main Contract"]],
  ["lad", "LAD is RM 8,000 per calendar day.", LOA, "Liquidated and ascertained damages shall be RM 8,000.00 per calendar day."],
  ["lad", "The subcontractor also indemnifies the contractor against employer LAD caused by the subcontractor.", SC, "the Subcontractor shall indemnify the Contractor against any liquidated damages imposed on the Contractor by the Employer to the extent caused by the Subcontractor"],
  ["eot", "Written notice within 7 days of a delay event is a condition precedent to EOT.", SC, "The Subcontractor shall give written notice of any delay event within seven (7) days of its occurrence; such notice shall be a condition precedent to any extension of time."],
  ["eot", "EOT is only granted to the extent the employer grants the contractor a corresponding EOT.", SC, "The Subcontractor shall only be entitled to an extension of time to the extent that the Contractor is granted a corresponding extension of time by the Employer under the Main Contract."],
  ["defects", "The defects period is 24 months from practical completion of the Main Contract Works.", SC, "The Defects Liability Period shall be twenty-four (24) months from practical completion of the Main Contract Works."],
  ["scope", "No claim is allowed for unforeseen ground conditions, obstructions or boulders.", SC, "no claim shall be allowed for any unforeseen ground conditions, obstructions or boulders"],
  ["scope", "The contractor provides access roads and a working platform.", SC, "The Contractor will provide access roads and a working platform."],
  ["variations", "Variations are only valid if instructed in writing and signed by a Director of the contractor.", SC, "No variation shall be valid unless instructed in writing and signed by a Director of the Contractor."],
  ["variations", "Variation claims must be submitted within 14 days or are waived.", SC, "Any claim for a variation shall be submitted within fourteen (14) days of the instruction, failing which the Subcontractor shall be deemed to have waived its entitlement."],
  ["variations", "Where BQ rates don't apply, the contractor sets the rate.", SC, "at fair rates determined by the Contractor"],
  ["termination", "The contractor may terminate for convenience on 7 days' notice with no loss of profit.", SC, "The Contractor may terminate the Subcontractor's employment at any time for its convenience by giving seven (7) days' notice, in which event the Subcontractor shall be paid the value of work properly executed and shall have no claim for loss of profit."],
  ["suspension", "The subcontractor may not suspend or slow down, even for non-payment.", SC, "The Subcontractor shall not suspend or slow down the Works for any reason whatsoever, including non-payment."],
  ["disputes", "Arbitration (AIAC, Kuala Lumpur) only after completion of the Main Contract Works.", SC, "Any dispute shall be referred to arbitration in Kuala Lumpur under the AIAC Arbitration Rules after completion of the Main Contract Works."],
  ["disputes", "Payment disputes can still go to CIPAA adjudication.", SC, "Nothing in this clause shall prevent either party from referring a payment dispute to adjudication under the Construction Industry Payment and Adjudication Act 2012."],
  ["insurance", "The subcontractor bears a RM 50,000 deductible per CAR claim arising from its works.", SC, "The Subcontractor shall bear the deductible of RM 50,000 for each claim arising from its works."],
  ["payment", "Certified amounts paid late attract 5% per annum interest.", SC, "Any amount certified but unpaid after the due date shall attract interest at five percent (5%) per annum."],
  ["precedence", "On any conflict between documents, the contractor's interpretation prevails.", SC, "In the event of any conflict or discrepancy between the documents forming the Subcontract, the Contractor's interpretation shall prevail."],
  ["precedence", "Main Contract conditions are deemed incorporated so far as applicable.", LOA, "The Main Contract conditions are deemed incorporated into the Subcontract so far as applicable."],
  ["other", "The subcontract conditions are Revision B, marked draft for discussion.", SC, "REVISION B — DRAFT FOR DISCUSSION"],
  ["other", "The LOA must be signed and returned within 3 days.", LOA, "Please sign and return the duplicate of this letter within three (3) days of the date of this letter as your acceptance of this award."],
];

const GAPS: Gap[] = [
  { id: "G01", category: "lad", statement: "No cap on LAD or on the employer-LAD indemnity." },
  { id: "G02", category: "termination", statement: "No payment for demobilisation, materials ordered or lost profit on termination for convenience." },
  { id: "G03", category: "precedence", statement: "Main Contract conditions are incorporated but were not provided." },
  { id: "G04", category: "scope", statement: "No drawings, pile layout, specification or soil investigation report in the package." },
];

const INTAKE: Intake = {
  documents: [
    { name: SAMPLE_FILES[0], doc_type: "Letter of Award", status: "signed", summary: "Issued and signed by Contoh Bina; awaiting your acceptance within 3 days." },
    { name: SAMPLE_FILES[1], doc_type: "Subcontract Conditions", status: "draft", summary: "Revision B, marked draft for discussion; sets payment, EOT, LAD, termination and dispute terms." },
    { name: SAMPLE_FILES[2], doc_type: "Bill of Quantities (summary)", status: "unclear", summary: "Remeasurable BQ totalling RM 2,361,600 with provisional testing items." },
  ],
  missing_documents: [
    { name: "Main Contract conditions", why: "Incorporated by the LOA and drive your EOT, LAD and payment position, but not provided." },
    { name: "Pile layout drawings and specification", why: "Scope refers to the contractor's drawings; quantities can't be checked without them." },
    { name: "Soil investigation report", why: "You carry all ground-condition risk under clause 5.2." },
    { name: "Contractor's master programme", why: "Clause 14.1 binds you to it as updated from time to time." },
  ],
  precedence_note: "No fixed order of precedence: clause 1.3 lets the contractor's interpretation prevail on any conflict, and the LOA deems the Main Contract conditions incorporated.",
  terms: SAMPLE_TERMS,
};

const REVIEWS: Record<SpecialistReview["agent"], { summary: string; protections: SpecialistReview["protections"] }> = {
  payment: {
    summary: "Getting paid is the biggest problem. You wait up to 81 days per claim, you only get paid after they do, and they can deduct money from other jobs.",
    protections: [
      { title: "Interest on late payment", explanation: "Certified amounts paid late earn 5% a year, which helps when chasing payment.", fact_ids: ["F32"] },
      { title: "CIPAA adjudication is kept", explanation: "You can still take a payment dispute to adjudication without waiting for arbitration.", fact_ids: ["F30"] },
    ],
  },
  scope: {
    summary: "The work is clear, but you carry all the ground risk, extra work is hard to get paid for, and the lump sum and BQ don't match.",
    protections: [{ title: "They provide access roads and the working platform", explanation: "Platform preparation, often a disputed cost on piling jobs, is theirs.", fact_ids: ["F23"] }],
  },
  time: {
    summary: "Time is the second big risk: you only get extra time if the employer grants it, a late notice loses it, and delay penalties have no cap.",
    protections: [{ title: "Clear 16-week period", explanation: "The LOA fixes the duration from site possession.", fact_ids: ["F06"] }],
  },
  remedies: {
    summary: "Exit terms favour Contoh Bina: they can end the job at 7 days' notice and you can't stop work when unpaid. Bond and insurance terms are standard.",
    protections: [{ title: "Payment disputes can go to adjudication", explanation: "Clause 21.2 keeps your CIPAA route open.", fact_ids: ["F30"] }],
  },
  consistency: {
    summary: "The paperwork is incomplete and one-sided: a draft contract, an unseen main contract, and Contoh Bina's interpretation wins every conflict.",
    protections: [],
  },
};

const DECISION: Decision = {
  verdict: "do_not_sign_yet",
  headline: "Don't sign yet. On these terms you'd fund almost the whole job yourself, far beyond your RM 300k, and delays could cost you without limit.",
  summary:
    "The job is workable, but the terms push the cash, ground and delay risk onto you. Fix payment and the delay penalties first; most of the rest is commonly negotiated.",
  focus: ["conditional_payment", "payment_period", "lad", "eot", "precedence"],
  missing_evidence: [
    { item: "Main Contract conditions (payment, EOT, LAD, defects)", why: "They are incorporated into your subcontract and drive your EOT and LAD exposure.", ask_from: "Contoh Bina", timing: "before_signing" },
    { item: "Final subcontract conditions (not the Rev B draft)", why: "You would be accepting terms that may still change.", ask_from: "Contoh Bina", timing: "before_signing" },
    { item: "Soil investigation report and pile layout drawings", why: "To price ground risk and check BQ quantities.", ask_from: "Contoh Bina / Employer's consultant", timing: "before_signing" },
    { item: "Master programme", why: "You are bound to it as updated from time to time.", ask_from: "Contoh Bina", timing: "before_mobilisation" },
    { item: "Counterparty checks (SSM, CIDB grade, credit report)", why: "No track record with this contractor.", ask_from: "Your own checks", timing: "before_signing" },
  ],
  confidence: {
    level: "medium",
    reasons: [
      "Core payment, time and LAD terms are clear and quoted from the documents.",
      "The Main Contract is incorporated but not provided, so some obligations are unseen.",
      "The subcontract conditions are still a draft.",
      "BQ quantities are provisional, so the final value may move.",
    ],
  },
};

async function loadSampleTexts() {
  const dir = path.join(process.cwd(), "public", "sample-deal");
  return Promise.all(SAMPLE_FILES.map((name) => readFile(path.join(dir, name), "utf8")));
}

function buildFacts(texts: string[]): Fact[] {
  return FACTS.map(([category, statement, doc, quotes], i) => {
    const list = Array.isArray(quotes) ? quotes : [quotes];
    return {
      id: `F${String(i + 1).padStart(2, "0")}`,
      category,
      statement,
      sources: list.map((quote) => {
        const text = texts[doc];
        const at = text.indexOf(quote);
        return {
          docIndex: doc,
          docName: SAMPLE_FILES[doc],
          quote,
          before: at >= 0 ? text.slice(Math.max(0, at - 220), at) : undefined,
          after: at >= 0 ? text.slice(at + quote.length, at + quote.length + 220) : undefined,
        };
      }),
    };
  });
}

export async function buildDemoAnalysis(deal: DealInput): Promise<Analysis> {
  const texts = await loadSampleTexts();
  const reviews: SpecialistReview[] = (Object.keys(REVIEWS) as SpecialistReview["agent"][]).map((agent) => {
    const provisions = provisionsFor(agent).map((def) => applyFloor({ provision_id: def.id, ...DEMO_PROVISIONS[def.id], negotiation: null, change: null }, SAMPLE_TERMS, deal.redLines));
    return { agent, summary: REVIEWS[agent].summary, provisions, findings: deriveFindings(agent, provisions), protections: REVIEWS[agent].protections };
  });
  const documents: DocMeta[] = SAMPLE_FILES.map((name, index) => ({
    index,
    name,
    kind: "text",
    sizeBytes: Buffer.byteLength(texts[index]),
  }));
  const runs = (
    [
      ["intake", 21400, 9800, 1900, 0],
      ["facts", 38200, 8600, 4100, 0],
      ["payment", 27300, 11200, 2600, 7900],
      ["scope", 24100, 11100, 2200, 7900],
      ["time", 25800, 11150, 2300, 7900],
      ["remedies", 26900, 11180, 2400, 7900],
      ["consistency", 23500, 11120, 2100, 7900],
      ["scoring", 2, 0, 0, 0],
      ["funding", 3, 0, 0, 0],
      ["decision", 31600, 7400, 2900, 0],
    ] as [AgentId, number, number, number, number][]
  ).map(([agent, ms, inputTokens, outputTokens, cacheReadTokens]) => ({ agent, ms, inputTokens, outputTokens, cacheReadTokens }));

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    mode: "demo",
    model: "demo (sample analysis)",
    deal,
    documents,
    intake: INTAKE,
    facts: buildFacts(texts),
    gaps: GAPS,
    reviews,
    check: dealCheck(reviews.flatMap((r) => r.provisions)),
    playbook: checkPlaybook(INTAKE.terms, deal.redLines),
    funding: computeFunding(deal, INTAKE.terms),
    decision: DECISION,
    runs,
    failures: [],
  };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Replays the pipeline timing so the live view can be seen without Bedrock. */
export async function runDemoPipeline(deal: DealInput, emit: (e: PipelineEvent) => void): Promise<Analysis> {
  const step = async (agents: AgentId[], ms: number) => {
    agents.forEach((agent) => emit({ type: "agent", agent, status: "running" }));
    for (const [i, agent] of agents.entries()) {
      await wait(i === 0 ? ms : 350);
      emit({ type: "agent", agent, status: "done" });
    }
  };
  await step(["intake", "facts"], 1800);
  await step(["payment", "scope", "time", "remedies", "consistency"], 2000);
  await step(["scoring", "funding"], 400);
  await step(["decision"], 1600);
  return buildDemoAnalysis(deal);
}

const DEMO_REPLIES: [RegExp, string][] = [
  [
    /first|priorit|negotiat|ask/i,
    "Start with payment. Ask Contoh Bina to delete the pay-when-paid proviso [F12] and move to 14-day certification and 30-day payment [F10] [F11]. That one change does more for your cash than everything else combined [PAY-1] [PAY-2].\n\nSecond, ask for a 10% advance against an advance payment bond [PAY-4].\n\nNext step: send these two asks in writing before the 3-day acceptance deadline [F36], and ask for 14 days to review the final conditions.",
  ],
  [
    /cash|fund|money|gap|afford/i,
    "On the current terms you claim monthly [F09], wait up to 21 days for certification [F10] and then 60 days for payment [F11]. With no advance [F08], the funding model shows you carrying over RM 2M at peak, against the RM 300k you have.\n\nIf payment also slips 30 days, the gap grows further. Pay-when-paid [F12] makes that slippage more likely.\n\nNext step: don't mobilise until payment terms or an advance are agreed.",
  ],
  [
    /lad|delay|eot|time/i,
    "LAD is RM 8,000 a day [F17] with no cap stated [G01], and you also indemnify Contoh Bina against the employer's LAD [F18]. A 4-week delay is RM 224,000 [TIM-2].\n\nWorse, you only get EOT if the employer grants it to Contoh Bina [F20], and late notice kills the claim [F19] [TIM-1].\n\nNext step: ask for EOT for any delay you didn't cause, and a combined LAD cap of 10% of the sum.",
  ],
];

export function demoReply(question: string) {
  const hit = DEMO_REPLIES.find(([re]) => re.test(question));
  return (
    hit?.[1] ??
    "This is demo mode, so I answer from the sample analysis only. The short version: don't sign this week. Payment terms [PAY-1] [PAY-2], back-to-back EOT [TIM-1] and the contractor's power to resolve conflicts [DOC-2] all need to change first.\n\nConnect Bedrock (see BEDROCK_SETUP.md) to ask anything about your own documents."
  );
}
