import type { AgentId, SpecialistId } from "./types";

export interface AgentMeta {
  id: AgentId;
  label: string;
  short: string;
  layer: number; // position in the pipeline graph (0 = inputs)
  parents: (AgentId | "inputs")[];
  kind: "claude" | "calculation";
  blurb: string;
}

export const AGENTS: AgentMeta[] = [
  {
    id: "intake",
    label: "Document Intake & Key Terms",
    short: "Intake",
    layer: 1,
    parents: ["inputs"],
    kind: "claude",
    blurb: "Classifies each document, flags missing ones and pulls the payment, retention and LAD terms.",
  },
  {
    id: "facts",
    label: "Contract Fact Ledger",
    short: "Fact ledger",
    layer: 1,
    parents: ["inputs"],
    kind: "claude",
    blurb: "Extracts every commercial fact with a verified quote and page from your documents.",
  },
  {
    id: "payment",
    label: "Payment & Certification",
    short: "Payment",
    layer: 2,
    parents: ["intake", "facts"],
    kind: "claude",
    blurb: "Claims, certification, pay-when-paid, set-off, retention and advance recovery.",
  },
  {
    id: "scope",
    label: "Scope, BQ & Variations",
    short: "Scope & VOs",
    layer: 2,
    parents: ["intake", "facts"],
    kind: "claude",
    blurb: "Scope gaps, BQ basis, variation instructions, valuation and time bars.",
  },
  {
    id: "time",
    label: "Time, EOT & LAD",
    short: "Time & LAD",
    layer: 2,
    parents: ["intake", "facts"],
    kind: "claude",
    blurb: "Programme, EOT notices, back-to-back EOT, LAD rate and cap, defects period.",
  },
  {
    id: "remedies",
    label: "Termination, Suspension & Remedies",
    short: "Remedies",
    layer: 2,
    parents: ["intake", "facts"],
    kind: "claude",
    blurb: "Termination, suspension, bonds, indemnities and dispute resolution.",
  },
  {
    id: "consistency",
    label: "Document Consistency & Counterparty",
    short: "Consistency",
    layer: 2,
    parents: ["intake", "facts"],
    kind: "claude",
    blurb: "Conflicts between LOA, subcontract and BQ, precedence, and who you are contracting with.",
  },
  {
    id: "scoring",
    label: "Rule Checks",
    short: "Rule checks",
    layer: 3,
    parents: ["payment", "scope", "time", "remedies", "consistency"],
    kind: "calculation",
    blurb: "Checks the numbers against your red lines and CIPAA 2012, and grades every point.",
  },
  {
    id: "funding",
    label: "Funding Exposure Calculator",
    short: "Funding",
    layer: 3,
    parents: ["intake", "payment"],
    kind: "calculation",
    blurb: "Week-by-week cash position from the payment terms and your deal inputs.",
  },
  {
    id: "decision",
    label: "Decision & Negotiation Strategist",
    short: "Decision",
    layer: 4,
    parents: ["scoring", "funding"],
    kind: "claude",
    blurb: "Verdict, negotiation priorities, missing evidence and assessment confidence.",
  },
];

export const AGENT_BY_ID = Object.fromEntries(AGENTS.map((a) => [a.id, a])) as Record<AgentId, AgentMeta>;

export const FINDING_PREFIX: Record<SpecialistId, string> = {
  payment: "PAY",
  scope: "SCO",
  time: "TIM",
  remedies: "REM",
  consistency: "DOC",
};
