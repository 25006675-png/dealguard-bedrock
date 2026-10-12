import type { Severity, Verdict } from "./types";

export const rm = (n: number) => `RM ${Math.round(n).toLocaleString("en-MY")}`;

export function rmCompact(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}RM ${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
  if (abs >= 1_000) return `${sign}RM ${Math.round(abs / 1_000)}k`;
  return `${sign}RM ${Math.round(abs)}`;
}

export const SEVERITY: Record<Severity, { label: string; color: string; text: string; soft: string; rank: number }> = {
  critical: { label: "Critical", color: "var(--critical)", text: "var(--critical-text)", soft: "var(--critical-soft)", rank: 0 },
  high: { label: "High", color: "var(--serious)", text: "var(--serious-text)", soft: "var(--serious-soft)", rank: 1 },
  medium: { label: "Medium", color: "var(--warning)", text: "var(--warning-text)", soft: "var(--warning-soft)", rank: 2 },
  low: { label: "Low", color: "var(--low)", text: "var(--low-text)", soft: "var(--low-soft)", rank: 3 },
};

export const VERDICT: Record<Verdict, { label: string; color: string; text: string; soft: string }> = {
  do_not_sign_yet: { label: "Don't sign yet", color: "var(--critical)", text: "var(--critical-text)", soft: "var(--critical-soft)" },
  negotiate_before_signing: { label: "Negotiate before signing", color: "var(--serious)", text: "var(--serious-text)", soft: "var(--serious-soft)" },
  proceed_with_conditions: { label: "Proceed with conditions", color: "var(--warning)", text: "var(--warning-text)", soft: "var(--warning-soft)" },
  proceed: { label: "Proceed", color: "var(--good)", text: "var(--good-text)", soft: "var(--good-soft)" },
};

export const TIMING_LABEL = {
  before_signing: "Before signing",
  before_mobilisation: "Before mobilising",
  during_works: "During works",
} as const;
