"use client";

import dynamic from "next/dynamic";
import { AGENT_BY_ID, AGENTS } from "@/lib/agents";
import type { Analysis } from "@/lib/types";
import { StatusIcon } from "../RunView";
import { Card, CardHeader } from "../ui";

const PipelineScene = dynamic(() => import("../PipelineScene"), { ssr: false });

export function Method({ analysis }: { analysis: Analysis }) {
  const status = Object.fromEntries(
    AGENTS.map((a) => [a.id, analysis.failures.some((f) => f.agent === a.id) ? "failed" : "done"]),
  ) as Record<string, "done" | "failed">;
  const totals = analysis.runs.reduce(
    (s, r) => ({ in: s.in + r.inputTokens, out: s.out + r.outputTokens, cache: s.cache + r.cacheReadTokens }),
    { in: 0, out: 0, cache: 0 },
  );

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <Card className="paper overflow-hidden lg:col-span-7">
        <CardHeader title="Agent pipeline" hint="Drag to rotate. Eight Claude steps on Bedrock, two plain calculations." />
        <PipelineScene status={status} advisorReady interactive className="h-[440px] w-full" />
      </Card>
      <Card className="lg:col-span-5">
        <CardHeader title="Steps" hint={`${analysis.model} · ${analysis.mode === "demo" ? "demo replay" : "Amazon Bedrock"}`} />
        <table className="w-full text-[13px] tabular">
          <thead className="text-left text-ink-3">
            <tr>
              <th className="px-5 py-2 font-medium">Step</th>
              <th className="px-2 py-2 text-right font-medium">Time</th>
              <th className="px-5 py-2 text-right font-medium">Tokens in / out</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {AGENTS.map((a) => {
              const r = analysis.runs.find((x) => x.agent === a.id);
              return (
                <tr key={a.id}>
                  <td className="px-5 py-2">
                    <span className="flex items-center gap-2">
                      <StatusIcon state={status[a.id]} calc={a.kind === "calculation"} />
                      {a.short}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right">{r ? (r.ms < 1000 ? "<1s" : `${Math.round(r.ms / 1000)}s`) : "–"}</td>
                  <td className="px-5 py-2 text-right text-ink-2">{r && r.inputTokens ? `${(r.inputTokens / 1000).toFixed(1)}k / ${(r.outputTokens / 1000).toFixed(1)}k` : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-ink-3">
          {(totals.in / 1000).toFixed(0)}k input tokens ({(totals.cache / 1000).toFixed(0)}k served from prompt cache) and {(totals.out / 1000).toFixed(0)}k output tokens.
        </p>
        {analysis.failures.map((f) => (
          <p key={f.agent} className="border-t border-line px-5 py-2.5 text-[13px]" style={{ color: "var(--critical-text)" }}>
            {AGENT_BY_ID[f.agent].short}: {f.message}
          </p>
        ))}
      </Card>

      <Card className="lg:col-span-7">
        <CardHeader title="How each point is graded" hint="The AI reads and grades; plain rules set a minimum for anything that's a number." />
        <ul className="divide-y divide-line text-[14px]">
          {[
            ["Deal-breaker", "Should not be signed as written: could sink the business. Usually 0 to 3 per contract."],
            ["Worth negotiating", "Worse than normal Malaysian practice and commonly negotiated."],
            ["Normal", "Usual for Malaysian subcontracts, even if not ideal."],
          ].map(([g, d]) => (
            <li key={g} className="px-5 py-2.5">
              <span className="font-medium">{g}:</span> <span className="text-ink-2">{d}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-line px-5 py-3">
          <p className="text-[13px] font-medium">Rule minimums (from your red lines)</p>
          <ul className="mt-1.5 space-y-1 text-[13px] text-ink-2">
            <li>Pay-when-paid wording → deal-breaker (CIPAA s.35)</li>
            <li>LAD with no cap → deal-breaker; cap above your red line → worth negotiating</li>
            <li>Payment more than 60 days after certification → deal-breaker; above your red line → worth negotiating</li>
            <li>Certification, retention limit, bond and defects period above your red lines → worth negotiating</li>
          </ul>
          <p className="mt-2 text-[12.5px] text-ink-3">The AI can grade a point higher than the rule (for example retention released only on the main contract), never lower.</p>
        </div>
      </Card>

      <Card className="lg:col-span-5">
        <CardHeader title="Points by area" hint={`${analysis.check.dealBreakers} deal-breakers · ${analysis.check.unfavourable} worth negotiating · ${analysis.check.normal} normal`} />
        <table className="w-full text-[13px] tabular">
          <thead className="text-left text-ink-3">
            <tr>
              <th className="px-5 py-2 font-medium">Area</th>
              <th className="px-2 py-2 text-right font-medium">Deal-breakers</th>
              <th className="px-2 py-2 text-right font-medium">Negotiate</th>
              <th className="px-5 py-2 text-right font-medium">Normal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {analysis.check.groups.map((g) => (
              <tr key={g.group}>
                <td className="px-5 py-2">{g.label}</td>
                <td className="px-2 py-2 text-right" style={g.dealBreakers ? { color: "var(--critical-text)", fontWeight: 600 } : undefined}>
                  {g.dealBreakers}
                </td>
                <td className="px-2 py-2 text-right">{g.unfavourable}</td>
                <td className="px-5 py-2 text-right text-ink-3">{g.normal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
