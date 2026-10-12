"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useMemo, useRef } from "react";
import { rmCompact } from "@/lib/format";
import { computeFunding } from "@/lib/funding";
import { checkPlaybook } from "@/lib/playbook";
import { SAMPLE_DEAL, SAMPLE_TERMS } from "@/lib/sample";

// The sample deal's real cash curve, drawn as you scroll. Same maths as the app.

const W = 1000;
const H = 320;
const PAD = { l: 24, r: 24, t: 24, b: 40 };

function Marker({
  progress,
  at,
  x,
  y,
  label,
  align = "middle",
  below = false,
}: {
  progress: MotionValue<number>;
  at: number;
  x: number;
  y: number;
  label: string;
  align?: "start" | "middle" | "end";
  below?: boolean;
}) {
  const opacity = useTransform(progress, [at - 0.04, at + 0.02], [0, 1]);
  return (
    <motion.g style={{ opacity }}>
      <circle cx={x} cy={y} r={6} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
      <text x={x + (align === "start" ? 12 : align === "end" ? -12 : 0)} y={below ? y + 30 : y - 16} textAnchor={align} className="fill-[var(--ink)] text-[17px] font-semibold">
        {label}
      </text>
    </motion.g>
  );
}

export function CashCliff() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 55%"] });
  const drawn = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 0, 1]);

  const { funding, path, x, y, firstPayWeek, breaches } = useMemo(() => {
    const funding = computeFunding(SAMPLE_DEAL, SAMPLE_TERMS);
    const s = funding.series;
    const xMax = s[s.length - 1].week;
    const lo = Math.min(...s.map((p) => p.net), -SAMPLE_DEAL.fundingCommitment) * 1.08;
    const hi = Math.max(...s.map((p) => p.net), 0) + Math.abs(lo) * 0.12;
    const x = (w: number) => PAD.l + (w / xMax) * (W - PAD.l - PAD.r);
    const y = (v: number) => PAD.t + ((hi - v) / (hi - lo)) * (H - PAD.t - PAD.b);
    const path = s.map((p, i) => `${i ? "L" : "M"}${x(p.week).toFixed(1)} ${y(p.net).toFixed(1)}`).join(" ");
    const firstPay = s.find((p, i) => i > 0 && p.received > s[i - 1].received);
    const breaches = checkPlaybook(SAMPLE_TERMS, SAMPLE_DEAL.redLines).filter((c) => c.status === "breach" && c.source === "Your red line").length;
    return { funding, path, x, y, firstPayWeek: firstPay?.week ?? 0, breaches };
  }, []);

  const peak = funding.series.find((p) => p.week === funding.peakWeek)!;
  const lag = (SAMPLE_TERMS.certification_days ?? 0) + (SAMPLE_TERMS.payment_due_days ?? 0);
  const xMax = funding.series[funding.series.length - 1].week;

  return (
    <div ref={ref}>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label={`Cash position of the sample deal: peak funding need ${rmCompact(funding.peakNeed)} in week ${funding.peakWeek}.`}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke="var(--line-strong)" />
          <text x={PAD.l} y={y(0) - 8} className="fill-[var(--ink-3)] text-[14px]">
            RM 0
          </text>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(-SAMPLE_DEAL.fundingCommitment)} y2={y(-SAMPLE_DEAL.fundingCommitment)} stroke="var(--ink-3)" strokeDasharray="3 5" />
          <text x={W - PAD.r} y={y(-SAMPLE_DEAL.fundingCommitment) - 8} textAnchor="end" className="fill-[var(--ink-3)] text-[14px]">
            Cash you have: {rmCompact(SAMPLE_DEAL.fundingCommitment)}
          </text>
          <motion.path d={path} fill="none" stroke="var(--critical)" strokeWidth={3.5} strokeLinejoin="round" style={{ pathLength: drawn }} />
          <Marker progress={drawn} at={0.42} x={x(funding.peakWeek)} y={y(peak.net)} label={`Peak need ${rmCompact(funding.peakNeed)}`} align="end" below />
          <Marker progress={drawn} at={0.5} x={x(firstPayWeek)} y={y(funding.series[firstPayWeek].net)} label={`Week ${firstPayWeek}: first payment`} align="start" />
          {[0, Math.round(xMax / 2), xMax].map((w) => (
            <text key={w} x={x(w)} y={H - 10} textAnchor={w === 0 ? "start" : w === xMax ? "end" : "middle"} className="fill-[var(--ink-3)] text-[14px] tabular">
              Week {w}
            </text>
          ))}
        </svg>
      </div>
      <dl className="mt-8 grid gap-6 border-t border-line pt-8 sm:grid-cols-3">
        {[
          [`${lag} days`, "from your claim to cash in the bank"],
          [rmCompact(funding.gap), "more than you have, at the worst week"],
          [`${breaches} of your red lines`, "broken by the draft subcontract"],
        ].map(([v, l]) => (
          <div key={l}>
            <dt className="sr-only">{l}</dt>
            <dd className="text-[34px] font-semibold tracking-tight">{v}</dd>
            <dd className="mt-1 text-[14px] text-ink-2">{l}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
