"use client";

import { ArrowUpRight, FileText, SearchX } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AGENT_BY_ID } from "@/lib/agents";
import { rm } from "@/lib/format";
import type { Analysis, Fact, Finding, SourceRef } from "@/lib/types";
import { RefChip, SeverityBadge, Sheet } from "./ui";

interface EvidenceApi {
  open: (id: string) => void;
  factById: (id: string) => Fact | undefined;
}

// Object URLs let the drawer open an uploaded PDF at the cited page. One URL per
// File for the life of the tab; they are few and released when the page closes.
const objectUrls = new WeakMap<File, string>();
function objectUrlFor(file: File) {
  let url = objectUrls.get(file);
  if (!url) {
    url = URL.createObjectURL(file);
    objectUrls.set(file, url);
  }
  return url;
}

const EvidenceContext = createContext<EvidenceApi>({ open: () => {}, factById: () => undefined });

export const useEvidence = () => useContext(EvidenceContext);

export function EvidenceProvider({ analysis, files, children }: { analysis: Analysis; files: File[]; children: ReactNode }) {
  const [selected, setSelected] = useState<string | null>(null);
  const fileUrls = useMemo(() => Object.fromEntries(files.map((f) => [f.name, objectUrlFor(f)])), [files]);

  const facts = useMemo(() => new Map(analysis.facts.map((f) => [f.id, f])), [analysis.facts]);
  const findings = useMemo(() => new Map(analysis.reviews.flatMap((r) => r.findings).map((f) => [f.id, f])), [analysis.reviews]);
  const gaps = useMemo(() => new Map(analysis.gaps.map((g) => [g.id, g])), [analysis.gaps]);

  const open = useCallback((id: string) => setSelected(id), []);
  const api = useMemo(() => ({ open, factById: (id: string) => facts.get(id) }), [open, facts]);

  const fact = selected ? facts.get(selected) : undefined;
  const finding = selected ? findings.get(selected) : undefined;
  const gap = selected ? gaps.get(selected) : undefined;
  const usedBy = fact ? [...findings.values()].filter((f) => f.fact_ids.includes(fact.id)) : [];

  return (
    <EvidenceContext.Provider value={api}>
      {children}
      <Sheet
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        width={640}
        title={
          <span className="flex items-center gap-2">
            <span className="font-mono text-[13px] text-brand">{selected}</span>
            <span className="truncate">{finding ? "Finding" : gap ? "Not found in documents" : "Evidence"}</span>
          </span>
        }
      >
        {fact ? <FactView fact={fact} usedBy={usedBy} fileUrls={fileUrls} onOpen={open} /> : null}
        {finding ? <FindingView finding={finding} facts={facts} onOpen={open} /> : null}
        {gap ? (
          <div className="space-y-4 p-5">
            <p className="text-lg leading-snug">{gap.statement}</p>
            <p className="flex items-start gap-2 rounded-lg bg-sunken p-3 text-sm text-ink-2">
              <SearchX size={16} className="mt-0.5 shrink-0" aria-hidden />
              DealGuard looked for this term and couldn&apos;t find it, so there&apos;s no clause to quote. Ask the main contractor to confirm it in writing.
            </p>
          </div>
        ) : null}
        {selected && !fact && !finding && !gap ? <p className="p-5 text-sm text-ink-3">No record found for {selected}.</p> : null}
      </Sheet>
    </EvidenceContext.Provider>
  );
}

function FactView({ fact, usedBy, fileUrls, onOpen }: { fact: Fact; usedBy: Finding[]; fileUrls: Record<string, string>; onOpen: (id: string) => void }) {
  return (
    <div className="space-y-5 p-5">
      <div>
        <p className="text-[13px] font-medium capitalize text-ink-3">{fact.category}</p>
        <p className="mt-1 text-lg leading-snug">{fact.statement}</p>
      </div>
      {fact.sources.length ? (
        fact.sources.map((s, i) => <SourceBlock key={i} source={s} url={fileUrls[s.docName]} showPage={i === 0} />)
      ) : (
        <p className="rounded-lg bg-sunken p-3 text-sm text-ink-2">No citation was returned for this fact, so treat it as unverified.</p>
      )}
      {usedBy.length ? (
        <div>
          <p className="mb-2 text-[13px] font-medium text-ink-3">Used as evidence in</p>
          <ul className="space-y-1.5">
            {usedBy.map((f) => (
              <li key={f.id}>
                <button onClick={() => onOpen(f.id)} className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-sm hover:bg-surface-2">
                  <SeverityBadge severity={f.severity} compact />
                  <span className="font-mono text-xs text-ink-3">{f.id}</span>
                  <span className="truncate">{f.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function SourceBlock({ source, url, showPage }: { source: SourceRef; url?: string; showPage: boolean }) {
  const isPdf = source.docName.toLowerCase().endsWith(".pdf");
  const pageUrl = url && isPdf ? `${url}#page=${source.page ?? 1}` : url;
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2 px-4 py-2 text-[13px]">
        <span className="flex min-w-0 items-center gap-2 text-ink-2">
          <FileText size={14} className="shrink-0" aria-hidden />
          <span className="truncate">{source.docName}</span>
          {source.page ? (
            <span className="shrink-0 font-mono text-ink-3">
              p.{source.page}
              {source.endPage && source.endPage !== source.page + 1 && source.endPage > source.page ? `–${source.endPage - 1}` : ""}
            </span>
          ) : null}
        </span>
        {pageUrl ? (
          <a href={pageUrl} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 font-medium text-brand hover:underline">
            Open document <ArrowUpRight size={14} aria-hidden />
          </a>
        ) : null}
      </div>
      <blockquote className="px-4 py-3 font-serif text-[16px] leading-relaxed text-ink-2">
        {source.before ? <span className="text-ink-3">…{source.before}</span> : null}
        <mark className="quote text-ink">{source.quote}</mark>
        {source.after ? <span className="text-ink-3">{source.after}…</span> : null}
      </blockquote>
      {showPage && isPdf && url ? (
        <iframe title={`${source.docName} page ${source.page ?? 1}`} src={pageUrl} className="h-[52vh] w-full border-t border-line bg-sunken" />
      ) : null}
    </div>
  );
}

function FindingView({ finding, facts, onOpen }: { finding: Finding; facts: Map<string, Fact>; onOpen: (id: string) => void }) {
  return (
    <div className="space-y-5 p-5">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
          <SeverityBadge severity={finding.severity} />
          <span>{AGENT_BY_ID[finding.agent].label}</span>
        </div>
        <h2 className="mt-2 text-xl font-semibold leading-snug">{finding.title}</h2>
      </div>
      <dl className="space-y-4 text-[15px] leading-relaxed">
        <div>
          <dt className="text-[13px] font-medium text-ink-3">What the contract says</dt>
          <dd className="mt-1">{finding.contract_says}</dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-ink-3">Why it matters</dt>
          <dd className="mt-1">{finding.why_it_matters}</dd>
        </div>
        <div className="rounded-lg bg-brand-soft p-3">
          <dt className="text-[13px] font-medium text-brand">What to ask for</dt>
          <dd className="mt-1">{finding.recommendation}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-ink-2">
        {finding.amount_at_risk_rm ? <span>At risk ≈ {rm(finding.amount_at_risk_rm)}</span> : null}
      </div>
      <div>
        <p className="mb-2 text-[13px] font-medium text-ink-3">Evidence</p>
        {finding.fact_ids.length ? (
          <ul className="space-y-2">
            {finding.fact_ids.map((id) => {
              const f = facts.get(id);
              return (
                <li key={id} className="rounded-lg border border-line p-3">
                  <div className="flex items-start gap-2">
                    <RefChip id={id} onOpen={onOpen} />
                    <span className="text-sm">{f?.statement}</span>
                  </div>
                  {f?.sources[0] ? (
                    <p className="mt-2 line-clamp-3 font-serif text-[15px] leading-relaxed text-ink-2">
                      <mark className="quote">{f.sources[0].quote}</mark>
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink-3">This finding is about something missing from the documents, so there is no clause to quote.</p>
        )}
      </div>
    </div>
  );
}
