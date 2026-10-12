"use client";

import { rmCompact } from "@/lib/format";
import type { Analysis } from "@/lib/types";
import { FundingChart } from "../charts";
import { useEvidence } from "../evidence";
import { Card, CardHeader, cx, RefChip } from "../ui";
import { Stat } from "./shared";

export function CashFlow({ analysis }: { analysis: Analysis }) {
  const { open } = useEvidence();
  const f = analysis.funding;
  const paymentFacts = analysis.facts.filter((x) => ["payment", "retention", "advance", "setoff", "lad"].includes(x.category));
  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="grid grid-cols-2 gap-3 lg:col-span-12 lg:grid-cols-4">
        <Stat label="Peak funding need" value={rmCompact(f.peakNeed)} sub={`Week ${f.peakWeek}`} />
        <Stat label="If paid 30 days late" value={rmCompact(f.peakNeedLate)} sub={`+${rmCompact(f.peakNeedLate - f.peakNeed)} more`} />
        <Stat label="Shortfall vs your funding" value={f.gap > 0 ? rmCompact(f.gap) : "None"} sub={`${rmCompact(f.gapLate)} if paid late`} tone={f.gap > 0 ? "bad" : undefined} />
        <Stat label="Retention held" value={rmCompact(f.retentionHeld)} sub="Cash you won't see until release" />
      </div>
      <Card className="lg:col-span-12">
        <CardHeader title="Your cash position, week by week" hint="Spend follows an S-curve; claims are paid after certification and payment periods, less retention." />
        <div className="p-5">
          <FundingChart funding={f} commitment={analysis.deal.fundingCommitment} />
        </div>
      </Card>
      <Card className="lg:col-span-5">
        <CardHeader title="Assumptions" hint="From your documents where stated" />
        <table className="w-full text-[14px]">
          <tbody className="divide-y divide-line">
            {f.assumptions.map((a) => (
              <tr key={a.label}>
                <td className="px-5 py-2.5 text-ink-2">{a.label}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right font-medium tabular">{a.value}</td>
                <td className="px-5 py-2.5 text-right">
                  <span className={cx("rounded-full px-2 py-0.5 text-[11px]", a.source === "default" ? "bg-sunken text-ink-3" : "bg-brand-soft text-brand")}>{a.source}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card className="lg:col-span-7">
        <CardHeader title="Payment terms in your documents" hint="Each line links to the clause" />
        <ul className="divide-y divide-line">
          {paymentFacts.map((x) => (
            <li key={x.id} className="flex items-start gap-3 px-5 py-2.5 text-[14px]">
              <RefChip id={x.id} onOpen={open} />
              <span>{x.statement}</span>
            </li>
          ))}
          {!paymentFacts.length ? <li className="px-5 py-3 text-sm text-ink-3">No payment facts were extracted.</li> : null}
        </ul>
      </Card>
    </div>
  );
}
