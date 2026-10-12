import { connection } from "next/server";
import { bedrockConfig, getClient } from "@/lib/bedrock";
import { friendlyError } from "@/lib/errors";

// GET /api/health          → which mode, model and region the server is configured for
// GET /api/health?ping=1   → also makes a tiny Bedrock call to prove the connection works
export async function GET(req: Request) {
  await connection();
  const cfg = bedrockConfig();
  const info = { mode: cfg.demo ? "demo" : "bedrock", model: cfg.model, region: cfg.region, endpoint: cfg.endpoint, auth: cfg.auth };
  if (cfg.demo || new URL(req.url).searchParams.get("ping") !== "1") return Response.json(info);

  const started = Date.now();
  try {
    const msg = await getClient().messages.create({
      model: cfg.model,
      max_tokens: 512,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: "Reply with the single word: connected" }],
    });
    const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
    return Response.json({ ...info, ok: true, latencyMs: Date.now() - started, reply: text });
  } catch (err) {
    return Response.json({ ...info, ok: false, error: friendlyError(err) }, { status: 502 });
  }
}
