import { bedrockConfig, getClient } from "@/lib/bedrock";
import { analysisContext } from "@/lib/context";
import { DEMO_DRAFTS } from "@/lib/demo-drafts";
import { friendlyError } from "@/lib/errors";
import { DRAFT_SYSTEM, DRAFT_TASKS, type DraftKind } from "@/lib/prompts";
import type { Analysis } from "@/lib/types";

export const maxDuration = 120;

export async function POST(req: Request) {
  const cfg = bedrockConfig();
  let body: { kind?: DraftKind; analysis?: Analysis };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const { kind, analysis } = body;
  if (!kind || !(kind in DRAFT_TASKS) || !analysis?.check) {
    return Response.json({ error: "Run an analysis first, then choose a document to draft." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (cfg.demo) {
          for (const chunk of DEMO_DRAFTS[kind].match(/[^\n]*\n?/g) ?? []) {
            controller.enqueue(encoder.encode(chunk));
            await new Promise((r) => setTimeout(r, 12));
          }
        } else {
          const events = getClient().messages.stream({
            model: cfg.model,
            max_tokens: 8000,
            output_config: { effort: "medium" },
            system: [
              { type: "text", text: DRAFT_SYSTEM },
              { type: "text", text: analysisContext(analysis), cache_control: { type: "ephemeral" } },
            ],
            messages: [{ role: "user", content: DRAFT_TASKS[kind].task }],
          });
          for await (const event of events) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        }
      } catch (err) {
        console.error("[dealguard] draft failed:", err);
        controller.enqueue(encoder.encode(`\n\n⚠ ${friendlyError(err)}`));
      }
      controller.close();
    },
  });

  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
