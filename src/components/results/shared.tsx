"use client";

import { CircleCheck, CircleHelp, OctagonAlert, TriangleAlert } from "lucide-react";
import type { PlaybookCheck } from "@/lib/playbook";
import type { Grade, ObligationPhase, ProvisionRecord } from "@/lib/types";
import { Card } from "../ui";

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "bad" }) {
  return (
    <Card className="px-4 py-3.5">
      <p className="text-[13px] text-ink-3">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-[24px] font-semibold tracking-tight" style={tone === "bad" ? { color: "var(--critical-text)" } : undefined}>
        {tone === "bad" ? <TriangleAlert size={18} aria-label="Warning" /> : null}
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[12px] leading-snug text-ink-3">{sub}</p> : null}
    </Card>
  );
}

export const PHASES: { id: ObligationPhase; label: string; hint: string }[] = [
  { id: "before_signing", label: "Before signing", hint: "Do these before you accept" },
  { id: "mobilisation", label: "Mobilisation", hint: "Before and on starting site" },
  { id: "during_works", label: "During works", hint: "Notices and records on site" },
  { id: "getting_paid", label: "Getting paid", hint: "Every claim cycle" },
  { id: "completion", label: "Completion", hint: "Retention and defects" },
];

export const CHECK_STYLE = {
  pass: { Icon: CircleCheck, color: "var(--good)", text: "var(--good-text)", label: "Meets" },
  breach: { Icon: TriangleAlert, color: "var(--critical)", text: "var(--critical-text)", label: "Breaches" },
  unknown: { Icon: CircleHelp, color: "var(--low)", text: "var(--low-text)", label: "Not stated" },
} as const;

export function CheckRow({ check, compact }: { check: PlaybookCheck; compact?: boolean }) {
  const s = CHECK_STYLE[check.status];
  return (
    <li className="flex items-start gap-3 px-5 py-2.5">
      <s.Icon size={17} className="mt-0.5 shrink-0" style={{ color: s.color }} aria-label={s.label} />
      <div className="min-w-0 flex-1">
        <p className="text-[14px]">
          <span className="font-medium">{check.label}</span>
          {compact ? null : <span className="ml-2 text-[12px] text-ink-3">{check.source}</span>}
        </p>
        <p className="text-[13px] text-ink-2">
          Rule {check.rule} · <span style={{ color: s.text }}>deal {check.actual}</span>
        </p>
      </div>
    </li>
  );
}

export const GRADE_STYLE: Record<Grade, { label: string; color: string; text: string; soft: string; Icon: typeof CircleCheck }> = {
  deal_breaker: { label: "Deal-breaker", color: "var(--critical)", text: "var(--critical-text)", soft: "var(--critical-soft)", Icon: OctagonAlert },
  unfavourable: { label: "Worth negotiating", color: "var(--serious)", text: "var(--serious-text)", soft: "var(--serious-soft)", Icon: TriangleAlert },
  normal: { label: "Normal", color: "var(--good)", text: "var(--good-text)", soft: "var(--good-soft)", Icon: CircleCheck },
};

export function GradeBadge({ grade }: { grade: Grade }) {
  const g = GRADE_STYLE[grade];
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: g.soft, color: g.text }}>
      <g.Icon size={13} strokeWidth={2.25} style={{ color: g.color }} aria-hidden />
      {g.label}
    </span>
  );
}

/** Small marker for a provision: colour + icon shape carry the grade, never colour alone. */
export function ProvisionMark({ p }: { p: ProvisionRecord }) {
  if (p.status === "missing" && p.grade === "normal") {
    return <span className="grid size-4 shrink-0 place-items-center rounded-full border-2 border-dashed" style={{ borderColor: "var(--warning)" }} aria-label="Not covered" />;
  }
  const g = GRADE_STYLE[p.grade];
  return <g.Icon size={16} className="shrink-0" style={{ color: g.color }} aria-label={g.label} />;
}
