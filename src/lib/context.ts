import { PROVISION_BY_ID } from "./provisions";
import type { Analysis } from "./types";

const rm = (n: number | null | undefined) => (n == null ? "n/a" : `RM ${Math.round(n).toLocaleString("en-MY")}`);

/** A compact, stable rendering of an analysis for the advisor and drafting calls (cached as a prefix). */
export function analysisContext(a: Analysis) {
  const lines: string[] = [];
  const d = a.deal;
  lines.push(`Deal: ${d.packageType}; value ${rm(d.contractValue)}; funding available ${rm(d.fundingCommitment)}; advance ${rm(d.advancePayment)}; ${d.durationWeeks} weeks; form ${d.standardForm}; ${d.projectType} project; stage ${d.stage}.`);
  lines.push(`Subcontractor's context: ${d.context}`);
  if (a.decision) {
    lines.push(`\nVERDICT: ${a.decision.verdict} — ${a.decision.headline}\n${a.decision.summary}`);
    lines.push(`Confidence: ${a.decision.confidence.level} (${a.decision.confidence.reasons.join("; ")})`);
    lines.push(`Push on, in order: ${a.decision.focus.join(", ")}`);
    lines.push("\nMISSING EVIDENCE:");
    a.decision.missing_evidence.forEach((m) => lines.push(`- ${m.item} (${m.timing}, from ${m.ask_from}): ${m.why}`));
  }
  lines.push(`\nDEAL CHECK: ${a.check.dealBreakers} deal-breakers, ${a.check.unfavourable} unfavourable, ${a.check.normal} normal; ${a.check.notCovered} not covered by the documents.`);
  const f = a.funding;
  lines.push(`FUNDING: peak need ${rm(f.peakNeed)} (week ${f.peakWeek}), ${rm(f.peakNeedLate)} if paid 30 days late; shortfall ${rm(f.gap)} / ${rm(f.gapLate)}; retention held ${rm(f.retentionHeld)}; LAD for 4 weeks ${rm(f.ladFourWeeks)}.`);
  lines.push("\nPLAYBOOK CHECK:");
  a.playbook.forEach((c) => lines.push(`- ${c.status.toUpperCase()} ${c.source}: ${c.label} — rule ${c.rule}; deal ${c.actual}`));
  lines.push("\nCONTRACT BREAKDOWN:");
  for (const r of a.reviews) {
    for (const p of r.provisions) {
      const label = PROVISION_BY_ID[p.provision_id]?.label ?? p.provision_id;
      const obligations = p.obligations.map((o) => `${o.action}${o.deadline ? ` (${o.deadline})` : ""}`).join("; ");
      const n = p.negotiation;
      lines.push(
        `[${p.provision_id}] ${label} — ${p.grade}. ${p.headline}. ${p.summary}${p.why ? ` Why: ${p.why}` : ""} Normal: ${p.normal} Yours: ${p.yours}${obligations ? ` Must do: ${obligations}.` : ""}${n ? ` Ask: ${n.ask} Minimum: ${n.minimum} Walk away: ${n.walk_away}` : ""} (${p.fact_ids.join(", ")})`,
      );
    }
  }
  lines.push("\nFINDINGS:");
  for (const r of a.reviews) {
    for (const x of r.findings) {
      lines.push(`[${x.id}] ${x.severity.toUpperCase()} ${x.title}. ${x.contract_says} Why: ${x.why_it_matters} Recommend: ${x.recommendation} Evidence: ${x.fact_ids.join(", ") || "none"}`);
    }
    r.protections.forEach((p) => lines.push(`[protection] ${p.title}: ${p.explanation} (${p.fact_ids.join(", ")})`));
  }
  lines.push("\nFACT LEDGER:");
  for (const fact of a.facts) {
    const src = fact.sources[0];
    const where = src ? ` — ${src.docName}${src.page ? ` p.${src.page}` : ""}: "${src.quote.slice(0, 300)}"` : " (unverified)";
    lines.push(`[${fact.id}] ${fact.statement}${where}`);
  }
  a.gaps.forEach((g) => lines.push(`[${g.id}] NOT FOUND: ${g.statement}`));
  return `<analysis>\n${lines.join("\n")}\n</analysis>`;
}
