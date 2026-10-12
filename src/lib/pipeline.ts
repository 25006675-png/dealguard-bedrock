import type Anthropic from "@anthropic-ai/sdk";
import { bedrockConfig, callMessage, callTool, emptyUsage, type Usage } from "./bedrock";
import { documentBlocks, type PreparedDoc } from "./documents";
import { friendlyError } from "./errors";
import { computeFunding } from "./funding";
import { ledgerForPrompt, parseLedger } from "./ledger";
import { checkPlaybook, type PlaybookCheck, type RedLines } from "./playbook";
import {
  ANALYST_SYSTEM,
  DECISION_SYSTEM,
  FACTS_SYSTEM,
  FACTS_TASK,
  INTAKE_TASK,
  specialistTask,
} from "./prompts";
import { decisionSchema, intakeSchema, specialistSchema, toInputSchema } from "./schemas";
import { provisionsFor } from "./provisions";
import { applyFloor, dealCheck, deriveFindings } from "./rubric";
import type {
  AgentId,
  AgentRun,
  Analysis,
  DealCheck,
  DealInput,
  Decision,
  Fact,
  Gap,
  Intake,
  KeyTerms,
  PipelineEvent,
  ProvisionRecord,
  SpecialistId,
  SpecialistReview,
} from "./types";
import { SPECIALISTS } from "./types";

const INTAKE_TOOL: Anthropic.Tool = {
  name: "record_document_intake",
  description: "Record the document classification, missing documents, precedence and key commercial terms.",
  input_schema: toInputSchema(intakeSchema),
};
const SPECIALIST_TOOL: Anthropic.Tool = {
  name: "record_specialist_review",
  description: "Record the graded provisions and protections for your specialist area.",
  input_schema: toInputSchema(specialistSchema),
};
const DECISION_TOOL: Anthropic.Tool = {
  name: "record_deal_decision",
  description: "Record the verdict, negotiation priorities, missing evidence and confidence.",
  input_schema: toInputSchema(decisionSchema),
};
// Intake and the specialists share tools, system prompt and effort so the
// document prefix written by intake is a cache hit for all five specialists.
const DOC_TOOLS = [INTAKE_TOOL, SPECIALIST_TOOL];
// Low effort by default for speed; set DEALGUARD_EFFORT=medium or high to trade speed for depth.
const DOC_EFFORT = (["low", "medium", "high"] as const).find((e) => e === process.env.DEALGUARD_EFFORT) ?? "low";

const rm = (n: number) => `RM ${Math.round(n).toLocaleString("en-MY")}`;

const STAGE_LABEL: Record<DealInput["stage"], string> = {
  tender: "tender or quotation stage",
  loa: "Letter of Award received, not yet accepted",
  signed: "subcontract signed, not yet mobilised",
  in_progress: "works in progress",
};

export function describeDeal(deal: DealInput) {
  return `<deal_inputs>
Trade and package: ${deal.packageType || "not stated"}
Proposed subcontract value: ${deal.contractValue ? rm(deal.contractValue) : "not stated"}
Subcontractor's initial funding commitment: ${deal.fundingCommitment ? rm(deal.fundingCommitment) : "not stated"}
Advance payment offered: ${deal.advancePayment ? rm(deal.advancePayment) : "none"}
Package duration: ${deal.durationWeeks ? `${deal.durationWeeks} weeks` : "not stated"}
Standard form (as stated by the subcontractor): ${deal.standardForm || "not sure"}
Project type: ${deal.projectType === "unknown" ? "not sure" : deal.projectType}
Deal stage: ${STAGE_LABEL[deal.stage]}
Subcontractor's expected margin: ${deal.marginPct}%; monthly fixed overhead: ${deal.monthlyOverhead ? rm(deal.monthlyOverhead) : "not stated"}
Deal context from the subcontractor:
${deal.context || "(none provided)"}
</deal_inputs>`;
}

function cached<T extends Anthropic.ContentBlockParam>(block: T): T {
  return { ...block, cache_control: { type: "ephemeral" } };
}

export async function runPipeline(
  deal: DealInput,
  docs: PreparedDoc[],
  emit: (e: PipelineEvent) => void,
): Promise<Analysis> {
  const cfg = bedrockConfig();
  const runs: AgentRun[] = [];
  const failures: Analysis["failures"] = [];

  async function track<T>(agent: AgentId, fn: (usage: Usage) => Promise<T>): Promise<T | null> {
    emit({ type: "agent", agent, status: "running" });
    const usage = emptyUsage();
    const started = Date.now();
    try {
      const out = await fn(usage);
      runs.push({ agent, ms: Date.now() - started, ...usage });
      emit({ type: "agent", agent, status: "done" });
      return out;
    } catch (err) {
      const message = friendlyError(err);
      console.error(`[dealguard] ${agent} failed:`, err);
      failures.push({ agent, message });
      runs.push({ agent, ms: Date.now() - started, ...usage });
      emit({ type: "agent", agent, status: "failed", detail: message });
      return null;
    }
  }

  const dealText = describeDeal(deal);
  const blocks = documentBlocks(docs, { citations: false });
  const sharedPrefix: Anthropic.ContentBlockParam[] = [
    { type: "text", text: `${dealText}\n\nThe deal documents follow.` },
    ...blocks.slice(0, -1),
    cached(blocks[blocks.length - 1]),
  ];
  const system: Anthropic.TextBlockParam[] = [{ type: "text", text: ANALYST_SYSTEM }];

  // Stage 1 — intake and the citation-backed fact ledger run side by side.
  const [intake, ledger] = await Promise.all([
    track("intake", (usage) =>
      callTool({
        label: "Document intake",
        system,
        messages: [{ role: "user", content: [...sharedPrefix, { type: "text", text: INTAKE_TASK }] }],
        tools: DOC_TOOLS,
        toolName: INTAKE_TOOL.name,
        schema: intakeSchema,
        effort: DOC_EFFORT,
        usage,
      }),
    ),
    track("facts", async (usage) => {
      const msg = await callMessage({
        label: "Fact ledger",
        system: [{ type: "text", text: FACTS_SYSTEM }],
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: dealText },
              ...documentBlocks(docs, { citations: true }),
              { type: "text", text: FACTS_TASK },
            ],
          },
        ],
        effort: DOC_EFFORT,
        usage,
      });
      const parsed = parseLedger(msg.content, docs);
      if (!parsed.facts.length) throw new Error("Fact ledger came back empty");
      return parsed;
    }),
  ]);

  // Both first-stage calls failing almost always means a configuration problem
  // (credentials, model access, region), so stop before spending five more calls.
  if (!intake && !ledger) throw new Error(failures[0]?.message ?? "Document intake failed");

  const facts: Fact[] = ledger?.facts ?? [];
  const gaps: Gap[] = ledger?.gaps ?? [];
  const factIds = new Set(facts.map((f) => f.id));
  const intakeJson = intake ? JSON.stringify(intake, null, 1) : "Intake unavailable — rely on the documents directly.";
  const ledgerText = facts.length ? ledgerForPrompt(facts, gaps) : "Fact ledger unavailable — cite no fact IDs.";

  // Stage 2 — five specialists in parallel, reading the cached documents.
  const reviewResults = await Promise.all(
    SPECIALISTS.map((agent) =>
      track(agent, async (usage): Promise<SpecialistReview> => {
        const out = await callTool({
          label: agent,
          system,
          messages: [
            {
              role: "user",
              content: [...sharedPrefix, { type: "text", text: specialistTask(agent, intakeJson, ledgerText) }],
            },
          ],
          tools: DOC_TOOLS,
          toolName: SPECIALIST_TOOL.name,
          schema: specialistSchema,
          effort: DOC_EFFORT,
          usage,
        });
        return toReview(agent, out, factIds, intake?.terms ?? null, deal.redLines);
      }),
    ),
  );
  const reviews = reviewResults.filter((r): r is SpecialistReview => r !== null);
  if (!reviews.length) throw new Error(failures[failures.length - 1]?.message ?? "All specialist reviews failed");

  // Stage 3 — rule checks and funding maths (no AI).
  emit({ type: "agent", agent: "scoring", status: "running" });
  const check = dealCheck(reviews.flatMap((r) => r.provisions));
  const playbook = checkPlaybook(intake?.terms ?? null, deal.redLines);
  emit({ type: "agent", agent: "scoring", status: "done" });
  emit({ type: "agent", agent: "funding", status: "running" });
  const funding = computeFunding(deal, intake?.terms ?? null);
  emit({ type: "agent", agent: "funding", status: "done" });

  // Stage 4 — decision: verdict and which points to push.
  const decision = await track("decision", async (usage): Promise<Decision> => {
    const out = await callTool({
      label: "Decision",
      system: [{ type: "text", text: DECISION_SYSTEM }],
      messages: [{ role: "user", content: decisionBrief({ dealText, intake, reviews, check, funding, playbook, gaps, failures }) }],
      tools: [DECISION_TOOL],
      toolName: DECISION_TOOL.name,
      schema: decisionSchema,
      effort: DOC_EFFORT,
      usage,
    });
    const known = new Set(reviews.flatMap((r) => r.provisions.map((p) => p.provision_id)));
    return { ...out, focus: out.focus.map((f) => f.trim()).filter((f) => known.has(f)).slice(0, 5) };
  });

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    mode: "bedrock",
    model: cfg.model,
    deal,
    documents: docs.map((d) => d.meta),
    intake: intake as Intake | null,
    facts,
    gaps,
    reviews,
    check,
    funding,
    playbook,
    decision,
    runs,
    failures,
  };
}

type ModelProvision = Omit<ProvisionRecord, "grade" | "ai_grade" | "rule_note" | "negotiation" | "change"> & { grade: ProvisionRecord["grade"] };

function toReview(
  agent: SpecialistId,
  out: { summary: string; provisions: ModelProvision[]; protections: SpecialistReview["protections"] },
  factIds: Set<string>,
  terms: KeyTerms | null,
  redLines: RedLines,
): SpecialistReview {
  const keep = (ids: string[]) => ids.map((i) => i.trim().toUpperCase()).filter((i) => factIds.has(i));
  // One record per owned provision, in taxonomy order; anything the model skipped is marked unclear.
  const provisions = provisionsFor(agent).map((def) => {
    const rec = out.provisions.find((p) => p.provision_id.trim() === def.id);
    const base = rec
      ? {
          ...rec,
          provision_id: def.id,
          ai_grade: rec.grade,
          fact_ids: keep(rec.fact_ids),
          // Negotiation guide and wording are generated on demand (/api/guide).
          negotiation: null,
          change: null,
        }
      : {
          provision_id: def.id,
          status: "unclear" as const,
          headline: def.label,
          summary: "Not assessed in this run.",
          ai_grade: "normal" as const,
          why: "",
          normal: "",
          yours: "",
          cost_rm: null,
          cost_note: null,
          clause_ref: null,
          negotiation: null,
          change: null,
          obligations: [],
          fact_ids: [],
        };
    return applyFloor(base, terms, redLines);
  });
  return {
    agent,
    summary: out.summary,
    provisions,
    findings: deriveFindings(agent, provisions),
    protections: out.protections.map((p) => ({ ...p, fact_ids: keep(p.fact_ids) })),
  };
}

function decisionBrief(input: {
  dealText: string;
  intake: Intake | null;
  reviews: SpecialistReview[];
  check: DealCheck;
  funding: Analysis["funding"];
  playbook: PlaybookCheck[];
  gaps: Gap[];
  failures: Analysis["failures"];
}) {
  const { funding, check } = input;
  const risky = input.reviews
    .flatMap((r) => r.provisions)
    .filter((p) => p.grade !== "normal")
    .map((p) => ({ provision_id: p.provision_id, grade: p.grade, headline: p.headline, why: p.why, yours: p.yours, cost_rm: p.cost_rm }));
  const protections = input.reviews.flatMap((r) => r.protections.map((p) => p.title));
  return `${input.dealText}

<specialist_summaries>
${input.reviews.map((r) => `${r.agent}: ${r.summary}`).join("\n")}
</specialist_summaries>

<risky_provisions>
${JSON.stringify(risky, null, 1)}
</risky_provisions>

<deal_check>
${check.dealBreakers} deal-breakers, ${check.unfavourable} unfavourable, ${check.normal} normal; ${check.notCovered} provisions not covered by the documents.
</deal_check>

<protections_in_favour>
${protections.join("\n") || "none identified"}
</protections_in_favour>

<funding_exposure>
Peak funding need ${rm(funding.peakNeed)} in week ${funding.peakWeek}; ${rm(funding.peakNeedLate)} if payments run 30 days late.
Gap against the subcontractor's funding commitment: ${rm(funding.gap)} (on time), ${rm(funding.gapLate)} (30 days late).
Retention held until release: ${rm(funding.retentionHeld)}.${funding.ladFourWeeks ? ` LAD exposure for a 4-week delay: ${rm(funding.ladFourWeeks)}.` : ""}
Assumptions: ${funding.assumptions.map((a) => `${a.label} ${a.value} (${a.source})`).join("; ")}
</funding_exposure>

<playbook_check>
${input.playbook.map((c) => `${c.status.toUpperCase()} · ${c.source} · ${c.label}: rule ${c.rule}; deal ${c.actual}`).join("\n")}
</playbook_check>

<missing_documents>
${input.intake?.missing_documents.map((m) => `${m.name}: ${m.why}`).join("\n") || "none flagged"}
</missing_documents>

<terms_not_found>
${input.gaps.map((g) => `${g.id} ${g.statement}`).join("\n") || "none"}
</terms_not_found>
${input.failures.length ? `\nNote: these reviews failed and are missing from the inputs: ${input.failures.map((f) => f.agent).join(", ")}. Lower confidence accordingly.\n` : ""}
Decide, and choose up to 5 provision_ids to push on in focus. Report by calling record_deal_decision once.`;
}
