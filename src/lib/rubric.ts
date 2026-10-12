import { FINDING_PREFIX } from "./agents";
import type { RedLines } from "./playbook";
import { GROUPS, PROVISION_BY_ID } from "./provisions";
import type { DealCheck, Finding, Grade, KeyTerms, ProvisionRecord, SpecialistId } from "./types";

// Grading: the AI grades every provision, and plain rules set a floor for the
// terms that are numbers. The final grade is never below the floor, so the same
// contract can't come back "normal" on a term that breaks a rule.

const RANK: Record<Grade, number> = { normal: 0, unfavourable: 1, deal_breaker: 2 };
export const worse = (a: Grade, b: Grade): Grade => (RANK[a] >= RANK[b] ? a : b);

export const GRADE_LABEL: Record<Grade, string> = {
  deal_breaker: "Deal-breaker",
  unfavourable: "Unfavourable",
  normal: "Normal",
};

interface Floor {
  grade: Grade;
  note: string;
}

/** The rule-based minimum grade for a provision, from the extracted terms. */
export function ruleFloor(provisionId: string, t: KeyTerms | null, red: RedLines): Floor | null {
  if (!t) return null;
  switch (provisionId) {
    case "payment_period": {
      const d = t.payment_due_days;
      if (d == null) return null;
      if (d <= red.maxPaymentDays) return { grade: "normal", note: `Paid ${d} days after certification, within your ${red.maxPaymentDays}-day red line.` };
      if (d <= 60) return { grade: "unfavourable", note: `Paid ${d} days after certification, beyond your ${red.maxPaymentDays}-day red line.` };
      return { grade: "deal_breaker", note: `Paid ${d} days after certification, more than double the usual 30.` };
    }
    case "interim_claims": {
      const c = t.certification_days;
      if (c == null) return null;
      if (c <= red.maxCertDays) return { grade: "normal", note: `Certified within ${c} days, within your red line.` };
      return { grade: c <= 30 ? "unfavourable" : "deal_breaker", note: `Certified within ${c} days, beyond your ${red.maxCertDays}-day red line.` };
    }
    case "conditional_payment": {
      if (t.pay_when_paid == null) return null;
      if (!t.pay_when_paid) return { grade: "normal", note: "No pay-when-paid wording found." };
      return { grade: red.noPayWhenPaid ? "deal_breaker" : "unfavourable", note: "Pay-when-paid wording found. It's void under CIPAA s.35, but you'd have to go to adjudication to enforce that." };
    }
    case "retention": {
      if (!t.retention_pct) return null;
      if (t.retention_cap_pct == null) return { grade: "unfavourable", note: `${t.retention_pct}% retention with no limit.` };
      return t.retention_cap_pct <= red.maxRetentionCapPct
        ? { grade: "normal", note: `Retention limited to ${t.retention_cap_pct}% of the sum, within your red line.` }
        : { grade: "unfavourable", note: `Retention limit of ${t.retention_cap_pct}% is above your ${red.maxRetentionCapPct}% red line.` };
    }
    case "lad": {
      if (t.lad_per_day_rm == null) return null;
      if (t.lad_cap_pct == null) return { grade: "deal_breaker", note: `LAD of RM ${t.lad_per_day_rm.toLocaleString("en-MY")} a day with no cap.` };
      return t.lad_cap_pct <= red.maxLadCapPct
        ? { grade: "normal", note: `LAD capped at ${t.lad_cap_pct}% of the sum.` }
        : { grade: "unfavourable", note: `LAD cap of ${t.lad_cap_pct}% is above your ${red.maxLadCapPct}% red line.` };
    }
    case "bonds": {
      if (t.performance_bond_pct == null) return null;
      return t.performance_bond_pct <= red.maxBondPct
        ? { grade: "normal", note: `Bond of ${t.performance_bond_pct}%, within your red line.` }
        : { grade: "unfavourable", note: `Bond of ${t.performance_bond_pct}% is above your ${red.maxBondPct}% red line.` };
    }
    case "defects": {
      if (t.dlp_months == null) return null;
      return t.dlp_months <= red.maxDlpMonths
        ? { grade: "normal", note: `Defects period of ${t.dlp_months} months, within your red line.` }
        : { grade: "unfavourable", note: `Defects period of ${t.dlp_months} months is above your ${red.maxDlpMonths}-month red line.` };
    }
    default:
      return null;
  }
}

/** Apply the rule floor to the AI's grade. */
export function applyFloor(rec: Omit<ProvisionRecord, "grade" | "rule_note">, terms: KeyTerms | null, red: RedLines): ProvisionRecord {
  const floor = ruleFloor(rec.provision_id, terms, red);
  const grade = floor ? worse(rec.ai_grade, floor.grade) : rec.ai_grade;
  return { ...rec, grade, rule_note: floor && floor.grade !== "normal" ? floor.note : null };
}

export function dealCheck(provisions: ProvisionRecord[]): DealCheck {
  const count = (list: ProvisionRecord[], g: Grade) => list.filter((p) => p.grade === g).length;
  return {
    dealBreakers: count(provisions, "deal_breaker"),
    unfavourable: count(provisions, "unfavourable"),
    normal: count(provisions, "normal"),
    notCovered: provisions.filter((p) => p.status === "missing").length,
    groups: GROUPS.map((g) => {
      const list = provisions.filter((p) => PROVISION_BY_ID[p.provision_id]?.group === g.id);
      return { group: g.id, label: g.label, dealBreakers: count(list, "deal_breaker"), unfavourable: count(list, "unfavourable"), normal: count(list, "normal") };
    }),
  };
}

/** One finding per risky provision, so each issue appears once across the app. */
export function deriveFindings(agent: SpecialistId, provisions: ProvisionRecord[]): Finding[] {
  return provisions
    .filter((p) => p.grade !== "normal")
    .sort((a, b) => RANK[b.grade] - RANK[a.grade])
    .map((p, i) => ({
      id: `${FINDING_PREFIX[agent]}-${i + 1}`,
      agent,
      provision_id: p.provision_id,
      title: p.headline,
      severity: p.grade === "deal_breaker" ? "critical" : "high",
      contract_says: p.yours,
      why_it_matters: p.why,
      recommendation: p.negotiation?.ask ?? "Ask for a fairer term.",
      fact_ids: p.fact_ids,
      amount_at_risk_rm: p.cost_rm,
    }));
}

export const gradeRank = (g: Grade) => RANK[g];
