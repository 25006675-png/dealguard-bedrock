"use client";

import { BadgeCheck, Search } from "lucide-react";
import { useState } from "react";
import type { Analysis } from "@/lib/types";
import { useEvidence } from "../evidence";
import { Card, CardHeader } from "../ui";

export function Sources({ analysis }: { analysis: Analysis }) {
  const { open } = useEvidence();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const categories = [...new Set(analysis.facts.map((f) => f.category))].sort();
  const q = query.toLowerCase();
  const facts = analysis.facts.filter(
    (f) => (category === "all" || f.category === category) && (!q || f.statement.toLowerCase().includes(q) || f.sources.some((s) => s.quote.toLowerCase().includes(q))),
  );
  const intake = analysis.intake;

  return (
    <div className="space-y-5">
      {intake ? (
        <Card>
          <CardHeader title="Documents reviewed" hint={intake.precedence_note} />
          <ul className="divide-y divide-line">
            {intake.documents.map((d) => (
              <li key={d.name} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-[14px]">
                <span className="min-w-0 flex-1 basis-60 truncate font-medium">{d.name}</span>
                <span className="text-ink-2">{d.doc_type}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={
                    d.status === "draft"
                      ? { background: "var(--warning-soft)", color: "var(--warning-text)" }
                      : d.status === "signed"
                        ? { background: "var(--good-soft)", color: "var(--good-text)" }
                        : { background: "var(--low-soft)", color: "var(--low-text)" }
                  }
                >
                  {d.status}
                </span>
                <p className="basis-full text-[13px] text-ink-3">{d.summary}</p>
              </li>
            ))}
          </ul>
          {intake.missing_documents.length ? (
            <div className="border-t border-line px-5 py-3.5">
              <p className="text-[13px] font-medium text-ink-3">Not in the package</p>
              <ul className="mt-1.5 space-y-1 text-[14px]">
                {intake.missing_documents.map((m) => (
                  <li key={m.name}>
                    <span className="font-medium">{m.name}</span> <span className="text-ink-2">— {m.why}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Fact ledger"
          hint={`${analysis.facts.length} facts, each with the quote Bedrock returned from your documents`}
          action={
            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--good-text)" }}>
              <BadgeCheck size={14} aria-hidden /> {analysis.facts.filter((f) => f.sources.length).length} verified
            </span>
          }
        />
        <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3">
          <label className="flex h-9 min-w-56 flex-1 items-center gap-2 rounded-lg border border-line-strong px-3">
            <Search size={15} className="text-ink-3" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search facts and quotes" className="w-full bg-transparent text-sm outline-none" />
          </label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-sm capitalize">
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <ul className="divide-y divide-line">
          {facts.map((f) => (
            <li key={f.id}>
              <button onClick={() => open(f.id)} className="grid w-full grid-cols-[52px_minmax(0,1fr)] gap-x-3 px-5 py-3 text-left hover:bg-surface-2 sm:grid-cols-[52px_minmax(0,1fr)_220px]">
                <span className="font-mono text-[12.5px] font-medium text-brand">{f.id}</span>
                <span className="text-[14px]">
                  <span className="mr-2 text-[11px] uppercase tracking-wide text-ink-3">{f.category}</span>
                  {f.statement}
                </span>
                <span className="col-start-2 truncate text-[12px] text-ink-3 sm:col-start-3 sm:text-right">
                  {f.sources[0] ? `${f.sources[0].docName}${f.sources[0].page ? ` · p.${f.sources[0].page}` : ""}` : "unverified"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {analysis.gaps.length ? (
        <Card>
          <CardHeader title="Looked for but not found" hint="Terms you'd expect in a subcontract that aren't in these documents" />
          <ul className="divide-y divide-line">
            {analysis.gaps.map((g) => (
              <li key={g.id} className="flex items-start gap-3 px-5 py-2.5 text-[14px]">
                <span className="font-mono text-[12.5px] text-ink-3">{g.id}</span>
                <span>{g.statement}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
