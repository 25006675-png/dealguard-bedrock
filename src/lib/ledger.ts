import type Anthropic from "@anthropic-ai/sdk";
import type { PreparedDoc } from "./documents";
import type { Fact, Gap, SourceRef } from "./types";

const CONTEXT_CHARS = 220;
const LINE = /^\s*\[(F|G)(\d+)\]\s*([^|\n]+?)\s*\|\s*(.+?)\s*$/;

/**
 * Turn a citations-enabled response into ledger facts. Claude splits its text into
 * blocks and attaches citations to the blocks it quoted from, so each ledger line
 * collects the citations of the blocks that overlap it. Quotes come from the API,
 * not from the model's own wording, which is what makes them verifiable.
 */
export function parseLedger(content: Anthropic.ContentBlock[], docs: PreparedDoc[]): { facts: Fact[]; gaps: Gap[] } {
  let full = "";
  const segments: { start: number; end: number; citations: Anthropic.TextCitation[] }[] = [];
  for (const block of content) {
    if (block.type !== "text") continue;
    const start = full.length;
    full += block.text;
    segments.push({ start, end: full.length, citations: block.citations ?? [] });
  }

  const facts: Fact[] = [];
  const gaps: Gap[] = [];
  let offset = 0;
  for (const line of full.split("\n")) {
    const start = offset;
    const end = offset + line.length;
    offset = end + 1;
    const m = LINE.exec(line);
    if (!m) continue;
    const [, kind, num, category, statement] = m;
    const id = `${kind}${num.padStart(2, "0")}`;
    const cleanStatement = statement.replace(/\s+/g, " ").trim();
    if (kind === "G") {
      gaps.push({ id, category: category.trim().toLowerCase(), statement: cleanStatement });
      continue;
    }
    const sources: SourceRef[] = [];
    const seen = new Set<string>();
    for (const seg of segments) {
      if (seg.end <= start || seg.start >= end) continue;
      for (const c of seg.citations) {
        const ref = toSourceRef(c, docs);
        if (!ref) continue;
        const key = `${ref.docIndex}:${ref.quote}`;
        if (seen.has(key)) continue;
        seen.add(key);
        sources.push(ref);
      }
    }
    facts.push({ id, category: category.trim().toLowerCase(), statement: cleanStatement, sources });
  }
  return { facts, gaps };
}

function toSourceRef(c: Anthropic.TextCitation, docs: PreparedDoc[]): SourceRef | null {
  if (c.type !== "page_location" && c.type !== "char_location") return null;
  const doc = docs.find((d) => d.meta.index === c.document_index);
  const docName = doc?.meta.name ?? c.document_title ?? `Document ${c.document_index + 1}`;
  const quote = c.cited_text.trim();
  if (c.type === "page_location") {
    return { docIndex: c.document_index, docName, quote, page: c.start_page_number, endPage: c.end_page_number };
  }
  const text = doc?.text ?? "";
  return {
    docIndex: c.document_index,
    docName,
    quote,
    before: text.slice(Math.max(0, c.start_char_index - CONTEXT_CHARS), c.start_char_index),
    after: text.slice(c.end_char_index, c.end_char_index + CONTEXT_CHARS),
  };
}

export function ledgerForPrompt(facts: Fact[], gaps: Gap[]) {
  const lines = facts.map((f) => `${f.id} [${f.category}] ${f.statement}${f.sources.length ? "" : " (unverified)"}`);
  if (gaps.length) {
    lines.push("", "Not found in the documents:");
    lines.push(...gaps.map((g) => `${g.id} [${g.category}] ${g.statement}`));
  }
  return lines.join("\n");
}
