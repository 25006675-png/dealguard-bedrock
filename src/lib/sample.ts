import { DEFAULT_RED_LINES } from "./playbook";
import type { DealInput, KeyTerms } from "./types";

// Fictional sample deal served from public/sample-deal.
export const SAMPLE_FILES = ["LOA_P2_Bored_Piling.txt", "Subcontract_Conditions_RevB.txt", "BQ_Summary_P2.csv"];

export const SAMPLE_DEAL: DealInput = {
  packageType: "Bored piling and empty bore works (Package P2)",
  contractValue: 2400000,
  fundingCommitment: 300000,
  advancePayment: 0,
  durationWeeks: 16,
  context:
    "We are a Grade G5 piling subcontractor in Selangor. Contoh Bina wants the LOA signed within 3 days so we can mobilise on 3 November. The subcontract conditions are still a draft (Rev B) and we haven't seen the main contract. Cash flow is our main worry: we have RM 300k available and our office and yard overhead runs about RM 35k a month. We haven't worked with Contoh Bina before.",
  standardForm: "Bespoke (main contractor's own conditions)",
  projectType: "private",
  stage: "loa",
  marginPct: 12,
  monthlyOverhead: 35000,
  redLines: DEFAULT_RED_LINES,
};

// Terms as read from the sample documents (used by demo mode and the landing page).
export const SAMPLE_TERMS: KeyTerms = {
  contract_sum_rm: 2400000,
  completion_weeks: 16,
  claim_interval_days: 30,
  certification_days: 21,
  payment_due_days: 60,
  retention_pct: 10,
  retention_cap_pct: 5,
  advance_payment_pct: 0,
  lad_per_day_rm: 8000,
  lad_cap_pct: null,
  dlp_months: 24,
  performance_bond_pct: 5,
  pay_when_paid: true,
};
