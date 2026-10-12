import type { KeyTerms } from "./types";

// The subcontractor's own red lines, plus CIPAA 2012 benchmarks. Checked in code
// against the terms extracted at intake, so the result is repeatable.

export interface RedLines {
  maxPaymentDays: number; // payment due after certification
  maxCertDays: number;
  maxRetentionCapPct: number;
  maxLadCapPct: number; // LAD must be capped at or below this % of the sum
  maxBondPct: number;
  maxDlpMonths: number;
  noPayWhenPaid: boolean;
}

export const DEFAULT_RED_LINES: RedLines = {
  maxPaymentDays: 30,
  maxCertDays: 21,
  maxRetentionCapPct: 5,
  maxLadCapPct: 10,
  maxBondPct: 5,
  maxDlpMonths: 24,
  noPayWhenPaid: true,
};

export const RED_LINE_FIELDS: { key: Exclude<keyof RedLines, "noPayWhenPaid">; label: string; unit: string }[] = [
  { key: "maxPaymentDays", label: "Paid within", unit: "days of certification" },
  { key: "maxCertDays", label: "Certified within", unit: "days of claim" },
  { key: "maxRetentionCapPct", label: "Retention limit at most", unit: "% of sum" },
  { key: "maxLadCapPct", label: "LAD capped at most", unit: "% of sum" },
  { key: "maxBondPct", label: "Performance bond at most", unit: "% of sum" },
  { key: "maxDlpMonths", label: "Defects period at most", unit: "months" },
];

export interface PlaybookCheck {
  id: string;
  label: string;
  source: "Your red line" | "CIPAA 2012";
  rule: string;
  actual: string;
  status: "pass" | "breach" | "unknown";
  provisionId: string;
}

export function sanitizeRedLines(raw: unknown): RedLines {
  const r = (raw ?? {}) as Partial<Record<keyof RedLines, unknown>>;
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 10_000 ? v : d);
  return {
    maxPaymentDays: num(r.maxPaymentDays, DEFAULT_RED_LINES.maxPaymentDays),
    maxCertDays: num(r.maxCertDays, DEFAULT_RED_LINES.maxCertDays),
    maxRetentionCapPct: num(r.maxRetentionCapPct, DEFAULT_RED_LINES.maxRetentionCapPct),
    maxLadCapPct: num(r.maxLadCapPct, DEFAULT_RED_LINES.maxLadCapPct),
    maxBondPct: num(r.maxBondPct, DEFAULT_RED_LINES.maxBondPct),
    maxDlpMonths: num(r.maxDlpMonths, DEFAULT_RED_LINES.maxDlpMonths),
    noPayWhenPaid: typeof r.noPayWhenPaid === "boolean" ? r.noPayWhenPaid : DEFAULT_RED_LINES.noPayWhenPaid,
  };
}

function atMost(value: number | null, limit: number, unit: string) {
  if (value == null) return { actual: "Not stated", status: "unknown" as const };
  return { actual: `${value}${unit}`, status: value <= limit ? ("pass" as const) : ("breach" as const) };
}

export function checkPlaybook(terms: KeyTerms | null, red: RedLines): PlaybookCheck[] {
  const t = terms ?? ({} as Partial<KeyTerms>);
  const v = (k: keyof KeyTerms) => (typeof t[k] === "number" ? (t[k] as number) : null);
  const checks: PlaybookCheck[] = [];
  const add = (c: Omit<PlaybookCheck, "actual" | "status">, r: { actual: string; status: PlaybookCheck["status"] }) => checks.push({ ...c, ...r });

  add({ id: "pay_days", label: "Payment period", source: "Your red line", rule: `≤ ${red.maxPaymentDays} days after certification`, provisionId: "payment_period" }, atMost(v("payment_due_days"), red.maxPaymentDays, " days"));
  add({ id: "cert_days", label: "Certification period", source: "Your red line", rule: `≤ ${red.maxCertDays} days`, provisionId: "interim_claims" }, atMost(v("certification_days"), red.maxCertDays, " days"));

  const retention = v("retention_pct");
  const retCap = v("retention_cap_pct");
  add(
    { id: "retention_cap", label: "Retention limit", source: "Your red line", rule: `≤ ${red.maxRetentionCapPct}% of sum`, provisionId: "retention" },
    retention && retCap == null ? { actual: `${retention}% with no limit`, status: "breach" } : atMost(retCap, red.maxRetentionCapPct, "% of sum"),
  );

  const lad = v("lad_per_day_rm");
  const ladCap = v("lad_cap_pct");
  add(
    { id: "lad_cap", label: "LAD cap", source: "Your red line", rule: `Capped at ≤ ${red.maxLadCapPct}% of sum`, provisionId: "lad" },
    lad == null ? { actual: "No LAD rate found", status: "unknown" } : ladCap == null ? { actual: `RM ${lad.toLocaleString("en-MY")}/day, uncapped`, status: "breach" } : atMost(ladCap, red.maxLadCapPct, "% of sum"),
  );
  add({ id: "bond", label: "Performance bond", source: "Your red line", rule: `≤ ${red.maxBondPct}% of sum`, provisionId: "bonds" }, atMost(v("performance_bond_pct"), red.maxBondPct, "% of sum"));
  add({ id: "dlp", label: "Defects liability period", source: "Your red line", rule: `≤ ${red.maxDlpMonths} months`, provisionId: "defects" }, atMost(v("dlp_months"), red.maxDlpMonths, " months"));

  const pwp = t.pay_when_paid;
  const pwpResult = pwp == null ? { actual: "Not stated", status: "unknown" as const } : { actual: pwp ? "Pay-when-paid present" : "None found", status: pwp ? ("breach" as const) : ("pass" as const) };
  if (red.noPayWhenPaid) add({ id: "pwp_red", label: "Conditional payment", source: "Your red line", rule: "No pay-when-paid", provisionId: "conditional_payment" }, pwpResult);
  add({ id: "pwp_cipaa", label: "Conditional payment", source: "CIPAA 2012", rule: "s.35: conditional payment terms are void", provisionId: "conditional_payment" }, pwpResult);

  // CIPAA s.36 default terms apply only where a contract is silent; used here as a fairness benchmark.
  const cert = v("certification_days");
  const due = v("payment_due_days");
  add(
    { id: "cipaa_due", label: "Claim to payment", source: "CIPAA 2012", rule: "Default terms (s.36): paid within 30 days of claim", provisionId: "payment_period" },
    cert == null && due == null ? { actual: "Not stated", status: "unknown" } : { actual: `Up to ${(cert ?? 0) + (due ?? 0)} days`, status: (cert ?? 0) + (due ?? 0) <= 30 ? "pass" : "breach" },
  );
  const interval = v("claim_interval_days");
  add(
    { id: "cipaa_freq", label: "Claim frequency", source: "CIPAA 2012", rule: "Default terms (s.36): monthly progress claims", provisionId: "interim_claims" },
    interval == null ? { actual: "Not stated", status: "unknown" } : { actual: `Every ${interval} days`, status: interval <= 31 ? "pass" : "breach" },
  );
  return checks;
}
