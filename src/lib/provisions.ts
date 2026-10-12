import type { SpecialistId } from "./types";

// The contract breakdown: the provisions a Malaysian trade subcontract should
// address, grouped the way an SME owner thinks about a deal. Each provision is
// owned by one specialist agent. Review with a QS before relying on it.

export type ProvisionGroup = "parties" | "price" | "payment" | "time" | "security" | "exit";

export const GROUPS: { id: ProvisionGroup; label: string }[] = [
  { id: "parties", label: "Parties & documents" },
  { id: "price", label: "Price & scope" },
  { id: "payment", label: "Getting paid" },
  { id: "time", label: "Changes & time" },
  { id: "security", label: "Security & liability" },
  { id: "exit", label: "Exit & disputes" },
];

export interface ProvisionDef {
  id: string;
  label: string;
  group: ProvisionGroup;
  owner: SpecialistId;
  looksFor: string; // guidance for the agent and tooltip text for the UI
}

export const PROVISIONS: ProvisionDef[] = [
  { id: "parties", label: "Parties & counterparty", group: "parties", owner: "consistency", looksFor: "Correct legal entities, signatory authority, counterparty track record and checks to run." },
  { id: "documents", label: "Contract documents & back-to-back", group: "parties", owner: "consistency", looksFor: "Which documents form the subcontract, documents incorporated by reference (main contract), draft or signed status, acceptance deadline." },
  { id: "precedence", label: "Order of precedence", group: "parties", owner: "consistency", looksFor: "How conflicts between documents are resolved, and conflicts that already exist between them." },
  { id: "sum_basis", label: "Contract sum & basis", group: "price", owner: "scope", looksFor: "Lump sum or remeasurement, provisional sums and items, what the sum includes." },
  { id: "scope", label: "Scope, inclusions & exclusions", group: "price", owner: "scope", looksFor: "What work is included and excluded, attendance and facilities provided by the main contractor, design responsibility." },
  { id: "site_conditions", label: "Site & ground conditions", group: "price", owner: "scope", looksFor: "Who carries unforeseen ground conditions, obstructions and site access risk." },
  { id: "interim_claims", label: "Progress claims & certification", group: "payment", owner: "payment", looksFor: "Claim frequency and format, who certifies, certification period, supporting documents required." },
  { id: "payment_period", label: "Payment period & late interest", group: "payment", owner: "payment", looksFor: "Days from certification (or claim) to payment, interest on late payment." },
  { id: "conditional_payment", label: "Conditional payment", group: "payment", owner: "payment", looksFor: "Pay-when-paid or pay-if-paid wording (void under CIPAA s.35)." },
  { id: "set_off", label: "Set-off & contra charges", group: "payment", owner: "payment", looksFor: "What the contractor may deduct, from which contracts, and with what notice." },
  { id: "retention", label: "Retention", group: "payment", owner: "payment", looksFor: "Retention rate, limit, release triggers and whether release is tied to your works or the main contract." },
  { id: "advance", label: "Advance payment", group: "payment", owner: "payment", looksFor: "Advance amount, security (advance payment bond) and recovery method." },
  { id: "variations", label: "Variation instructions", group: "time", owner: "scope", looksFor: "Who can instruct variations, in what form, and what happens to oral or site instructions." },
  { id: "variation_valuation", label: "Variation valuation & time bars", group: "time", owner: "scope", looksFor: "How variations are valued, rates for new items, and claim submission deadlines or waivers." },
  { id: "completion", label: "Commencement, programme & completion", group: "time", owner: "time", looksFor: "Site possession, duration, completion date, programme obligations, sectional completion." },
  { id: "eot", label: "Extension of time & notices", group: "time", owner: "time", looksFor: "EOT grounds, notice periods, conditions precedent, EOT that depends on the main contract." },
  { id: "lad", label: "Liquidated damages", group: "time", owner: "time", looksFor: "LAD rate, cap, and any extra indemnity for the employer's LAD." },
  { id: "defects", label: "Defects liability", group: "security", owner: "time", looksFor: "Defects liability period, when it starts, obligations during it." },
  { id: "bonds", label: "Performance bond", group: "security", owner: "remedies", looksFor: "Bond amount, on-demand or conditional, expiry, calling conditions." },
  { id: "insurance", label: "Insurance & indemnities", group: "security", owner: "remedies", looksFor: "Policies you must carry, deductibles you bear, indemnities and liability caps." },
  { id: "termination", label: "Termination", group: "exit", owner: "remedies", looksFor: "Termination for default and convenience, notice, what you are paid on termination, your own right to terminate." },
  { id: "suspension", label: "Suspension", group: "exit", owner: "remedies", looksFor: "Your right to suspend for non-payment, and any clause removing it." },
  { id: "disputes", label: "Disputes & CIPAA", group: "exit", owner: "remedies", looksFor: "Adjudication, arbitration or court, timing restrictions, anything limiting statutory adjudication." },
];

export const PROVISION_BY_ID = Object.fromEntries(PROVISIONS.map((p) => [p.id, p])) as Record<string, ProvisionDef>;

export const provisionsFor = (agent: SpecialistId) => PROVISIONS.filter((p) => p.owner === agent);
