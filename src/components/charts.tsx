"use client";

import { useMemo, useState } from "react";
import { rm, rmCompact } from "@/lib/format";
import type { FundingExposure } from "@/lib/types";

/* ---------------- Funding: net cash position over time ---------------- */

export function FundingChart({ funding, commitment }: { funding: FundingExposure; commitment: number }) {
  const [hoverWeek, setHoverWeek] = useState<number | null>(null);
  const W = 1000;
  const H = 360;
  const pad = { l: 72, r: 112, t: 16, b: 32 };
  const pts = funding.series;
  const xMax = pts[pts.length - 1]?.week ?? 1;
  const values = pts.flatMap((p) => [p.net, p.netLate]).concat([-commitment, 0]);
  const yMin = Math.min(...values) * 1.08;
  const yMax = Math.max(0, ...values) * 1.08 || Math.abs(yMin) * 0.1;
  const x = (w: number) => pad.l + (w / xMax) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + ((yMax - v) / (yMax - yMin)) * (H - pad.t - pad.b);
  const path = (key: "net" | "netLate") => pts.map((p, i) => `${i ? "L" : "M"} ${x(p.week).toFixed(1)} ${y(p[key]).toFixed(1)}`).join(" ");

  const ticks = useMemo(() => {
    const span = yMax - yMin;
    const step = [50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000].find((s) => span / s <= 6) ?? 5_000_000;
    const out: number[] = [];
    for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) out.push(v);
    return out;
  }, [yMin, yMax]);

  const hovered = hoverWeek != null ? pts.find((p) => p.week === hoverWeek) : null;
  const peak = pts.find((p) => p.week === funding.peakWeek);
  const last = pts[pts.length - 1];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const w = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * xMax);
    setHoverWeek(Math.max(0, Math.min(xMax, w)));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-ink-2">
        <span className="flex items-center gap-2">
          <svg width="22" height="8" aria-hidden>
            <line x1="0" y1="4" x2="22" y2="4" stroke="var(--series-1)" strokeWidth="2" />
          </svg>
          Paid on contract terms
        </span>
        <span className="flex items-center gap-2">
          <svg width="22" height="8" aria-hidden>
            <line x1="0" y1="4" x2="22" y2="4" stroke="var(--series-2)" strokeWidth="2" strokeDasharray="5 3" />
          </svg>
          Paid 30 days late
        </span>
        <span className="flex items-center gap-2">
          <svg width="22" height="8" aria-hidden>
            <line x1="0" y1="4" x2="22" y2="4" stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="2 3" />
          </svg>
          Your funding ({rmCompact(commitment)})
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`Cash position over ${xMax} weeks. Peak funding need ${rm(funding.peakNeed)} in week ${funding.peakWeek}.`}
        onPointerMove={onMove}
        onPointerLeave={() => setHoverWeek(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={t === 0 ? 1.2 : 0.8} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="fill-[var(--ink-3)] text-[11px] tabular">
              {rmCompact(t)}
            </text>
          </g>
        ))}
        {Array.from({ length: Math.floor(xMax / 4) + 1 }, (_, i) => i * 4).map((w) => (
          <text key={w} x={x(w)} y={H - 10} textAnchor="middle" className="fill-[var(--ink-3)] text-[11px] tabular">
            {w === 0 ? "Wk 0" : w}
          </text>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={y(-commitment)} y2={y(-commitment)} stroke="var(--ink-3)" strokeDasharray="2 3" />
        <rect
          x={pad.l}
          y={y(-commitment)}
          width={W - pad.l - pad.r}
          height={Math.max(0, y(yMin) - y(-commitment))}
          fill="var(--critical)"
          opacity={0.05}
        />
        <path d={path("netLate")} fill="none" stroke="var(--series-2)" strokeWidth={2} strokeDasharray="6 4" />
        <path d={path("net")} fill="none" stroke="var(--series-1)" strokeWidth={2} />
        {peak ? (
          <g>
            <circle cx={x(peak.week)} cy={y(peak.net)} r={5} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
            <text x={x(peak.week)} y={y(peak.net) + 20} textAnchor="middle" className="fill-[var(--ink)] text-[12px] font-medium">
              Peak need {rmCompact(funding.peakNeed)}
            </text>
          </g>
        ) : null}
        {last ? (
          <>
            <text x={W - pad.r + 8} y={y(last.net) + 4} className="fill-[var(--ink-2)] text-[11px]">
              On terms
            </text>
            <text x={W - pad.r + 8} y={y(last.netLate) + (Math.abs(y(last.netLate) - y(last.net)) < 14 ? 16 : 4)} className="fill-[var(--ink-2)] text-[11px]">
              30 days late
            </text>
          </>
        ) : null}
        <text x={W - pad.r + 8} y={y(-commitment) + 4} className="fill-[var(--ink-3)] text-[11px]">
          Your funding
        </text>
        {hovered ? (
          <g pointerEvents="none">
            <line x1={x(hovered.week)} x2={x(hovered.week)} y1={pad.t} y2={H - pad.b} stroke="var(--ink-3)" strokeWidth={1} />
            <circle cx={x(hovered.week)} cy={y(hovered.net)} r={4} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
            <circle cx={x(hovered.week)} cy={y(hovered.netLate)} r={4} fill="var(--series-2)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        ) : null}
      </svg>
      <div className="mt-2 min-h-[40px] rounded-lg bg-surface-2 px-3 py-2 text-[13px] tabular text-ink-2" aria-live="polite">
        {hovered ? (
          <span className="flex flex-wrap gap-x-5 gap-y-1">
            <span className="font-medium text-ink">Week {hovered.week}</span>
            <span>Spent {rm(hovered.cost)}</span>
            <span>Received {rm(hovered.received)}</span>
            <span style={{ color: "var(--ink)" }}>Position {rm(hovered.net)}</span>
            <span>If late {rm(hovered.netLate)}</span>
          </span>
        ) : (
          <span>Below zero means you are funding the works yourself. Hover the chart for week-by-week figures.</span>
        )}
      </div>
    </div>
  );
}
