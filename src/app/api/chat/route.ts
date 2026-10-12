import { bedrockConfig, getClient } from "@/lib/bedrock";
import { analysisContext } from "@/lib/context";
import { demoReply } from "@/lib/demo";
import { friendlyError } from "@/lib/errors";
import { ADVISOR_SYSTEM } from "@/lib/prompts";
import type { Analysis, ChatMessage } from "@/lib/types";

export const maxDuration = 120;

export async function POST(req: Request) {
  const cfg = bedrockConfig();
  let body: { analysis?: Analysis; messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const analysis = body.analysis;
  const history = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-20);
  if (!analysis?.check || !history.length || history[history.length - 1].role !== "user") {
    return Response.json({ error: "Run an analysis first, then ask a question." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const question = history[history.length - 1].content;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (cfg.demo) {
          for (const chunk of demoReply(question).match(/\S+\s*/g) ?? []) {
            controller.enqueue(encoder.encode(chunk));
            await new Promise((r) => setTimeout(r, 18));
          }
        } else {
          // History must start with a user turn.
          const firstUser = history.findIndex((m) => m.role === "user");
          const events = getClient().messages.stream({
            model: cfg.model,
            max_tokens: 8000,
            output_config: { effort: "medium" },
            system: [
              { type: "text", text: ADVISOR_SYSTEM },
              { type: "text", text: analysisContext(analysis), cache_control: { type: "ephemeral" } },
            ],
            messages: history.slice(firstUser).map((m) => ({ role: m.role, content: m.content })),
          });
          for await (const event of events) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        }
      } catch (err) {
        console.error("[dealguard] chat failed:", err);
        controller.enqueue(encoder.encode(`\n\n⚠ ${friendlyError(err)}`));
      }
      controller.close();
    },
  });

  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
