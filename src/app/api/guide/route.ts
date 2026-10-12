import type Anthropic from "@anthropic-ai/sdk";
import { bedrockConfig, callTool, emptyUsage } from "@/lib/bedrock";
import { demoGuide } from "@/lib/demo-provisions";
import { friendlyError } from "@/lib/errors";
import { describeDeal } from "@/lib/pipeline";
import { RED_LINE_FIELDS, sanitizeRedLines } from "@/lib/playbook";
import { GUIDE_SYSTEM } from "@/lib/prompts";
import { PROVISION_BY_ID } from "@/lib/provisions";
import { guideSchema, toInputSchema } from "@/lib/schemas";
import type { DealInput, Fact, ProvisionRecord } from "@/lib/types";

export const maxDuration = 60;

const GUIDE_TOOL: Anthropic.Tool = {
  name: "record_negotiation_guide",
  description: "Record the negotiation guide and proposed replacement wording for one contract point.",
  input_schema: toInputSchema(guideSchema),
};

// POST { deal, provision, facts } → { negotiation, change } for one contract point.
export async function POST(req: Request) {
  const cfg = bedrockConfig();
  let body: { deal?: DealInput; provision?: ProvisionRecord; facts?: Fact[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const { deal, provision } = body;
  const facts = (body.facts ?? []).slice(0, 12);
  if (!deal || !provision?.provision_id || !PROVISION_BY_ID[provision.provision_id]) {
    return Response.json({ error: "Unknown contract point." }, { status: 400 });
  }

  if (cfg.demo) {
    await new Promise((r) => setTimeout(r, 900));
    const guide = demoGuide(provision.provision_id);
    return guide ? Response.json(guide) : Response.json({ error: "No guide for this point in the sample." }, { status: 404 });
  }

  const red = sanitizeRedLines(deal.redLines);
  const def = PROVISION_BY_ID[provision.provision_id];
  const evidence = facts
    .map((f) => {
      const s = f.sources[0];
      return `${f.id}: ${f.statement}${s ? ` | Quote from ${s.docName}${s.page ? ` p.${s.page}` : ""}: "${s.quote.slice(0, 600)}"` : " | (no quote)"}`;
    })
    .join("\n");
  const brief = `${describeDeal(deal)}

The owner's red lines: ${RED_LINE_FIELDS.map((f) => `${f.label} ${red[f.key]} ${f.unit}`).join("; ")}${red.noPayWhenPaid ? "; never accept pay-when-paid" : ""}.

<contract_point>
Provision: ${def.label}${provision.clause_ref ? ` (${provision.clause_ref})` : ""}
Grade: ${provision.grade}${provision.rule_note ? ` (rule check: ${provision.rule_note})` : ""}
What it says: ${provision.summary}
Why it matters: ${provision.why}
Normal in the market: ${provision.normal}
This contract: ${provision.yours}
</contract_point>

<evidence>
${evidence || "No quoted evidence: this term is missing from the documents."}
</evidence>

Write the negotiation guide and the replacement wording for this point. replaces_fact_id must be one of the evidence IDs above whose quote the new wording replaces, or null if you're proposing a new clause. Report by calling ${GUIDE_TOOL.name} once.`;

  try {
    const out = await callTool({
      label: "Negotiation guide",
      system: [{ type: "text", text: GUIDE_SYSTEM }],
      messages: [{ role: "user", content: brief }],
      tools: [GUIDE_TOOL],
      toolName: GUIDE_TOOL.name,
      schema: guideSchema,
      effort: "low",
      maxTokens: 4000,
      usage: emptyUsage(),
    });
    const ids = new Set(facts.map((f) => f.id));
    const replaces = out.change.replaces_fact_id?.trim().toUpperCase() ?? null;
    return Response.json({
      negotiation: out.negotiation,
      change: { ...out.change, clause_ref: out.change.clause_ref ?? provision.clause_ref, replaces_fact_id: replaces && ids.has(replaces) ? replaces : null },
    });
  } catch (err) {
    console.error("[dealguard] guide failed:", err);
    return Response.json({ error: friendlyError(err) }, { status: 502 });
  }
}
