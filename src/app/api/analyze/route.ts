import { bedrockConfig } from "@/lib/bedrock";
import { runDemoPipeline } from "@/lib/demo";
import { MAX_FILES, MAX_TOTAL_BYTES, prepareFiles, UnsupportedFileError, type PreparedDoc } from "@/lib/documents";
import { friendlyError } from "@/lib/errors";
import { runPipeline } from "@/lib/pipeline";
import { sanitizeRedLines } from "@/lib/playbook";
import type { DealInput, PipelineEvent } from "@/lib/types";

export const maxDuration = 300;

function parseDeal(raw: FormDataEntryValue | null): DealInput | null {
  if (typeof raw !== "string") return null;
  try {
    const d = JSON.parse(raw);
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
    const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
    return {
      packageType: s(d.packageType, 300),
      contractValue: n(d.contractValue),
      fundingCommitment: n(d.fundingCommitment),
      advancePayment: n(d.advancePayment),
      durationWeeks: Math.min(n(d.durationWeeks), 520),
      context: s(d.context, 6000),
      standardForm: s(d.standardForm, 80) || "Not sure",
      projectType: d.projectType === "private" || d.projectType === "government" ? d.projectType : "unknown",
      stage: ["tender", "loa", "signed", "in_progress"].includes(d.stage) ? d.stage : "loa",
      marginPct: Math.min(n(d.marginPct), 60),
      monthlyOverhead: n(d.monthlyOverhead),
      redLines: sanitizeRedLines(d.redLines),
    };
  } catch {
    return null;
  }
}

const bad = (message: string) => Response.json({ error: message }, { status: 400 });

export async function POST(req: Request) {
  const cfg = bedrockConfig();
  const form = await req.formData();
  const deal = parseDeal(form.get("deal"));
  if (!deal) return bad("Deal details are missing.");
  if (!deal.contractValue) return bad("Enter the proposed subcontract value.");

  let docs: PreparedDoc[] = [];
  if (!cfg.demo) {
    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return bad("Upload at least one deal document.");
    if (files.length > MAX_FILES) return bad(`Upload at most ${MAX_FILES} files.`);
    const total = files.reduce((s, f) => s + f.size, 0);
    if (total > MAX_TOTAL_BYTES) return bad("Files are larger than 14 MB in total. Remove drawings or large scans and try again.");
    try {
      docs = await prepareFiles(files);
    } catch (err) {
      if (err instanceof UnsupportedFileError) return bad(err.message);
      throw err;
    }
    if (!docs.some((d) => d.meta.kind !== "image")) return bad("Add at least one PDF, Word or text document; images alone can't be cited.");
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: PipelineEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        const analysis = cfg.demo ? await runDemoPipeline(deal, emit) : await runPipeline(deal, docs, emit);
        emit({ type: "result", analysis });
      } catch (err) {
        console.error("[dealguard] analysis failed:", err);
        emit({ type: "error", message: friendlyError(err) });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
