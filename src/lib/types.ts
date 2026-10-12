// Shared types between the API routes and the UI.
import type { PlaybookCheck, RedLines } from "./playbook";

export type AgentId =
  | "intake"
  | "facts"
  | "payment"
  | "scope"
  | "time"
  | "remedies"
  | "consistency"
  | "scoring"
  | "funding"
  | "decision";

export type SpecialistId = "payment" | "scope" | "time" | "remedies" | "consistency";

export const SPECIALISTS: SpecialistId[] = ["payment", "scope", "time", "remedies", "consistency"];

export type Severity = "critical" | "high" | "medium" | "low";

export type DealStage = "tender" | "loa" | "signed" | "in_progress";
export type ProjectType = "private" | "government" | "unknown";

export interface DealInput {
  packageType: string;
  contractValue: number; // RM
  fundingCommitment: number; // RM the subcontractor can put in
  advancePayment: number; // RM offered up front (0 if none)
  durationWeeks: number;
  context: string;
  standardForm: string; // e.g. "PAM 2018 Subcontract", "Bespoke", "Not sure"
  projectType: ProjectType;
  stage: DealStage;
  marginPct: number; // expected margin on the package
  monthlyOverhead: number; // RM fixed overhead carried while the job runs
  redLines: RedLines;
}

export interface DocMeta {
  index: number; // position among document blocks sent to the model
  name: string;
  kind: "pdf" | "text" | "image";
  sizeBytes: number;
}

/** A verified pointer into an uploaded document, produced by Claude citations. */
export interface SourceRef {
  docIndex: number;
  docName: string;
  quote: string;
  page?: number;
  endPage?: number;
  before?: string; // surrounding text for text documents
  after?: string;
}

export interface Fact {
  id: string; // F01
  category: string;
  statement: string;
  sources: SourceRef[];
}

export interface Gap {
  id: string; // G01
  category: string;
  statement: string;
}

export interface KeyTerms {
  contract_sum_rm: number | null;
  completion_weeks: number | null;
  claim_interval_days: number | null;
  certification_days: number | null;
  payment_due_days: number | null;
  retention_pct: number | null;
  retention_cap_pct: number | null;
  advance_payment_pct: number | null;
  lad_per_day_rm: number | null;
  lad_cap_pct: number | null;
  dlp_months: number | null;
  performance_bond_pct: number | null;
  pay_when_paid: boolean | null;
}

export interface IntakeDocument {
  name: string;
  doc_type: string;
  status: "signed" | "draft" | "unclear";
  summary: string;
}

export interface Intake {
  documents: IntakeDocument[];
  missing_documents: { name: string; why: string }[];
  precedence_note: string;
  terms: KeyTerms;
}

export type ObligationPhase = "before_signing" | "mobilisation" | "during_works" | "getting_paid" | "completion";

export interface Obligation {
  action: string; // what the subcontractor must do
  deadline: string | null; // e.g. "within 7 days of the delay event"
  phase: ObligationPhase;
}

export type Grade = "normal" | "unfavourable" | "deal_breaker";

export interface Negotiation {
  ask: string; // what to ask for
  minimum: string; // the least you should accept
  walk_away: string; // when to walk away
  script: string; // one sentence to say to the main contractor
}

export interface ProposedChange {
  clause_ref: string | null; // e.g. "cl. 12.3"
  replaces_fact_id: string | null; // ledger fact whose verified quote is the original wording
  proposed_wording: string; // replacement clause text
}

export interface ProvisionRecord {
  provision_id: string;
  status: "present" | "missing" | "unclear";
  headline: string; // the point in everyday words
  summary: string; // what the documents say, in plain English
  grade: Grade; // final grade: the AI's view, never below the rule-based floor
  ai_grade: Grade;
  rule_note: string | null; // why a rule set the floor, if one did
  why: string; // why it's risky, in plain English
  normal: string; // what is normal in the market
  yours: string; // what this contract says, briefly
  cost_rm: number | null;
  cost_note: string | null;
  clause_ref: string | null;
  negotiation: Negotiation | null; // generated on demand
  change: ProposedChange | null; // generated on demand
  obligations: Obligation[];
  fact_ids: string[];
}

/** A risky provision, as one issue (derived in code from the provisions). */
export interface Finding {
  id: string; // PAY-1
  agent: SpecialistId;
  provision_id: string;
  title: string;
  severity: Severity;
  contract_says: string;
  why_it_matters: string;
  recommendation: string;
  fact_ids: string[];
  amount_at_risk_rm: number | null;
}

export interface Protection {
  title: string;
  explanation: string;
  fact_ids: string[];
}

export interface SpecialistReview {
  agent: SpecialistId;
  summary: string;
  provisions: ProvisionRecord[];
  findings: Finding[];
  protections: Protection[];
}

export interface DealCheck {
  dealBreakers: number;
  unfavourable: number;
  normal: number;
  notCovered: number; // provisions the documents don't address
  groups: { group: string; label: string; dealBreakers: number; unfavourable: number; normal: number }[];
}

export interface FundingPoint {
  week: number;
  cost: number; // cumulative spend
  received: number; // cumulative cash in (incl. advance)
  net: number; // received - cost
  netLate: number; // same, with payments 30 days late
}

export interface FundingExposure {
  assumptions: { label: string; value: string; source: "documents" | "deal input" | "default" }[];
  series: FundingPoint[];
  peakNeed: number;
  peakWeek: number;
  peakNeedLate: number;
  gap: number;
  gapLate: number;
  retentionHeld: number;
  ladFourWeeks: number | null;
}

export type Verdict = "proceed" | "proceed_with_conditions" | "negotiate_before_signing" | "do_not_sign_yet";

export interface Decision {
  verdict: Verdict;
  headline: string;
  summary: string;
  focus: string[]; // provision IDs to push, most important first
  missing_evidence: {
    item: string;
    why: string;
    ask_from: string;
    timing: "before_signing" | "before_mobilisation" | "during_works";
  }[];
  confidence: { level: "high" | "medium" | "low"; reasons: string[] };
}

export interface AgentRun {
  agent: AgentId;
  ms: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

export interface Analysis {
  id: string;
  createdAt: string;
  mode: "demo" | "bedrock";
  model: string;
  deal: DealInput;
  documents: DocMeta[];
  intake: Intake | null;
  facts: Fact[];
  gaps: Gap[];
  reviews: SpecialistReview[];
  check: DealCheck;
  funding: FundingExposure;
  playbook: PlaybookCheck[];
  decision: Decision | null;
  runs: AgentRun[];
  failures: { agent: AgentId; message: string }[];
}

export type PipelineEvent =
  | { type: "agent"; agent: AgentId; status: "running" | "done" | "failed"; detail?: string }
  | { type: "result"; analysis: Analysis }
  | { type: "error"; message: string };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
