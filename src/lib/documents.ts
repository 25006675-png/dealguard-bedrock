import type Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import type { DocMeta } from "./types";

export const MAX_TOTAL_BYTES = 14 * 1024 * 1024; // Bedrock caps request payloads at 20 MB; base64 adds ~33%
export const MAX_FILES = 12;

type ImageType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

export interface PreparedDoc {
  meta: DocMeta;
  pdfBase64?: string;
  text?: string;
  image?: { mediaType: ImageType; data: string };
}

const TEXT_EXT = ["txt", "md", "csv", "json", "html", "htm", "xml"];
const IMAGE_EXT: Record<string, ImageType> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export class UnsupportedFileError extends Error {}

function ext(name: string) {
  return name.toLowerCase().split(".").pop() ?? "";
}

/** Turn uploads into model-ready documents. Documents come first so citation indexes line up. */
export async function prepareFiles(files: File[]): Promise<PreparedDoc[]> {
  const docs: Omit<PreparedDoc, "meta">[] = [];
  const metas: Omit<DocMeta, "index">[] = [];
  const images: PreparedDoc[] = [];

  for (const file of files) {
    const e = ext(file.name);
    const buf = Buffer.from(await file.arrayBuffer());
    if (e === "pdf") {
      docs.push({ pdfBase64: buf.toString("base64") });
      metas.push({ name: file.name, kind: "pdf", sizeBytes: file.size });
    } else if (e === "docx") {
      const { value } = await mammoth.extractRawText({ buffer: buf });
      if (!value.trim()) throw new UnsupportedFileError(`${file.name} has no readable text.`);
      docs.push({ text: value });
      metas.push({ name: file.name, kind: "text", sizeBytes: file.size });
    } else if (TEXT_EXT.includes(e)) {
      const text = buf.toString("utf8");
      if (!text.trim()) throw new UnsupportedFileError(`${file.name} is empty.`);
      docs.push({ text });
      metas.push({ name: file.name, kind: "text", sizeBytes: file.size });
    } else if (IMAGE_EXT[e]) {
      images.push({
        meta: { index: -1, name: file.name, kind: "image", sizeBytes: file.size },
        image: { mediaType: IMAGE_EXT[e], data: buf.toString("base64") },
      });
    } else {
      throw new UnsupportedFileError(
        `${file.name}: .${e} isn't supported. Save it as PDF (or CSV for a BQ spreadsheet) and upload again.`,
      );
    }
  }

  const prepared: PreparedDoc[] = docs.map((d, i) => ({ ...d, meta: { ...metas[i], index: i } }));
  images.forEach((img, k) => (img.meta.index = prepared.length + k));
  return [...prepared, ...images];
}

/** Content blocks for the documents. `citations` turns on Claude citations (fact ledger only). */
export function documentBlocks(docs: PreparedDoc[], opts: { citations: boolean }): Anthropic.ContentBlockParam[] {
  return docs.map((d): Anthropic.ContentBlockParam => {
    if (d.image) {
      return { type: "image", source: { type: "base64", media_type: d.image.mediaType, data: d.image.data } };
    }
    return {
      type: "document",
      title: d.meta.name,
      source: d.pdfBase64
        ? { type: "base64", media_type: "application/pdf", data: d.pdfBase64 }
        : { type: "text", media_type: "text/plain", data: d.text ?? "" },
      ...(opts.citations ? { citations: { enabled: true } } : {}),
    };
  });
}
