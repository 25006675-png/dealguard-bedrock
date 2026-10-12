"use client";

import { ArrowLeft, ArrowRight, Check, Clock, Copy, FileText } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { GROUPS, PROVISIONS } from "@/lib/provisions";
import type { Analysis, Fact, ProvisionRecord } from "@/lib/types";
import { useEvidence } from "../evidence";
import { Card, cx, RefChip } from "../ui";
import { GuidePending } from "./ActionPlan";
import { useGuides } from "./guides";
import { CheckRow, GRADE_STYLE, GradeBadge, PHASES, ProvisionMark } from "./shared";

type Filter = "all" | "attention" | "missing";

const STATUS_LABEL = { present: "In the documents", missing: "Not in the documents", unclear: "Unclear" } as const;

export function Breakdown({ analysis, selected, onSelect }: { analysis: Analysis; selected: string; onSelect: (id: string) => void }) {
  const { open, factById } = useEvidence();
  const [filter, setFilter] = useState<Filter>("all");
  const [direction, setDirection] = useState(1);

  const records = useMemo(() => new Map(analysis.reviews.flatMap((r) => r.provisions).map((p) => [p.provision_id, p])), [analysis.reviews]);
  const needsAttention = (p: ProvisionRecord) => p.grade !== "normal";
  const visible = PROVISIONS.filter((d) => {
    const r = records.get(d.id);
    if (!r) return false;
    if (filter === "attention") return needsAttention(r);
    if (filter === "missing") return r.status !== "present";
    return true;
  });
  const current = records.has(selected) ? selected : (visible[0]?.id ?? PROVISIONS[0].id);
  const index = visible.findIndex((d) => d.id === current);
  const def = PROVISIONS.find((d) => d.id === current)!;
  const rec = records.get(current);

  function go(step: number) {
    if (!visible.length) return;
    const next = visible[(Math.max(index, 0) + step + visible.length) % visible.length];
    setDirection(step);
    onSelect(next.id);
  }

  // ← → (or j / k) step through provisions, unless typing or a panel is open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]") || document.querySelector('[role="dialog"]')) return;
      if (e.key === "ArrowRight" || e.key === "j") go(1);
      if (e.key === "ArrowLeft" || e.key === "k") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const counts = {
    all: records.size,
    attention: [...records.values()].filter(needsAttention).length,
    missing: [...records.values()].filter((p) => p.status !== "present").length,
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_340px]">
      {/* Provision list */}
      <aside className="min-w-0">
        <div className="flex gap-1 rounded-lg border border-line bg-sunken p-0.5" role="tablist" aria-label="Filter provisions">
          {(
            [
              ["all", "All"],
              ["attention", "Attention"],
              ["missing", "Gaps"],
            ] as [Filter, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={filter === id}
              onClick={() => setFilter(id)}
              className={cx("flex-1 whitespace-nowrap rounded-md px-1.5 py-1.5 text-[12.5px] font-medium", filter === id ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink-2")}
            >
              {label} <span className="tabular text-ink-3">{counts[id]}</span>
            </button>
          ))}
        </div>
        {/* On small screens the 23-item list becomes a picker so the detail is visible straight away. */}
        <select
          className="mt-3 h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-[15px] lg:hidden"
          value={current}
          onChange={(e) => onSelect(e.target.value)}
          aria-label="Choose a provision"
        >
          {GROUPS.map((g) => {
            const items = visible.filter((d) => d.group === g.id);
            return items.length ? (
              <optgroup key={g.id} label={g.label}>
                {items.map((d) => {
                  const r = records.get(d.id)!;
                  return (
                    <option key={d.id} value={d.id}>
                      {d.label}
                      {r.grade === "deal_breaker" ? " · deal-breaker" : r.grade === "unfavourable" ? " · negotiate" : ""}
                    </option>
                  );
                })}
              </optgroup>
            ) : null;
          })}
        </select>
        <nav className="mt-3 hidden max-h-[70vh] overflow-y-auto pr-1 lg:sticky lg:top-20 lg:block" aria-label="Provisions">
          {GROUPS.map((g) => {
            const items = visible.filter((d) => d.group === g.id);
            if (!items.length) return null;
            return (
              <div key={g.id} className="mb-3">
                <p className="px-2 pb-1 text-[11.5px] font-medium uppercase tracking-wide text-ink-3">{g.label}</p>
                {items.map((d) => {
                  const r = records.get(d.id)!;
                  const active = d.id === current;
                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        setDirection(visible.indexOf(d) >= index ? 1 : -1);
                        onSelect(d.id);
                      }}
                      className={cx(
                        "relative flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13.5px]",
                        active ? "text-ink" : "text-ink-2 hover:bg-sunken",
                      )}
                      aria-current={active ? "true" : undefined}
                    >
                      {active ? <motion.span layoutId="prov-active" className="absolute inset-0 rounded-lg border border-line bg-surface shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 40 }} /> : null}
                      <span className="relative flex w-4 justify-center">
                        <ProvisionMark p={r} />
                      </span>
                      <span className="relative min-w-0 flex-1 truncate">{d.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
          {!visible.length ? <p className="px-2 text-sm text-ink-3">Nothing in this filter.</p> : null}
        </nav>
      </aside>

      {/* Selected provision */}
      <Card className="min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-2.5 text-[12.5px] text-ink-3">
          <span>
            {GROUPS.find((g) => g.id === def.group)?.label} · <span className="tabular">{Math.max(index, 0) + 1} / {visible.length}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="mr-2 hidden sm:inline">Use ← → keys</span>
            <button onClick={() => go(-1)} className="rounded-md border border-line p-1.5 text-ink-2 hover:bg-sunken" aria-label="Previous provision">
              <ArrowLeft size={15} />
            </button>
            <button onClick={() => go(1)} className="rounded-md border border-line p-1.5 text-ink-2 hover:bg-sunken" aria-label="Next provision">
              <ArrowRight size={15} />
            </button>
          </span>
        </div>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            initial={{ opacity: 0, x: direction * 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -18 }}
            transition={{ duration: 0.16 }}
            className="px-5 py-5 sm:px-6"
          >
            {rec ? <ProvisionDetail def={def} rec={rec} analysis={analysis} onOpen={open} /> : null}
          </motion.div>
        </AnimatePresence>
      </Card>

      {/* Source */}
      <div className="min-w-0 lg:col-span-2 xl:col-span-1">
        {rec ? <SourcePanel key={current} factIds={rec.fact_ids} factById={factById} onOpen={open} /> : null}
      </div>
    </div>
  );
}

function ProvisionDetail({
  def,
  rec,
  analysis,
  onOpen,
}: {
  def: (typeof PROVISIONS)[number];
  rec: ProvisionRecord;
  analysis: Analysis;
  onOpen: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const checks = analysis.playbook.filter((c) => c.provisionId === def.id);
  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <GradeBadge grade={rec.grade} />
          <span className="rounded-full bg-sunken px-2 py-0.5 text-xs text-ink-2">{STATUS_LABEL[rec.status]}</span>
        </div>
        <p className="mt-2.5 text-[13px] font-medium text-ink-3">{def.label}</p>
        <h2 className="mt-0.5 text-[24px] font-semibold leading-tight tracking-tight">{rec.headline}</h2>
        <p className="mt-3 text-[16.5px] leading-relaxed">{rec.summary}</p>
        {rec.grade !== "normal" ? (
          <div className="mt-4 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
            <div className="bg-surface px-4 py-3">
              <p className="text-[11.5px] font-medium uppercase tracking-wide text-ink-3">Normal</p>
              <p className="mt-0.5 text-[14.5px]">{rec.normal}</p>
            </div>
            <div className="px-4 py-3" style={{ background: GRADE_STYLE[rec.grade].soft }}>
              <p className="text-[11.5px] font-medium uppercase tracking-wide" style={{ color: GRADE_STYLE[rec.grade].text }}>
                Yours
              </p>
              <p className="mt-0.5 text-[14.5px] font-medium">{rec.yours}</p>
            </div>
          </div>
        ) : null}
        {rec.why ? <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{rec.why}</p> : null}
      </div>

      {checks.length ? (
        <div className="-mx-5 border-y border-line bg-surface-2 sm:-mx-6">
          <ul className="divide-y divide-line">
            {checks.map((c) => (
              <CheckRow key={c.id} check={c} />
            ))}
          </ul>
        </div>
      ) : null}

      <section>
        <h3 className="text-[13px] font-medium text-ink-3">What you must do</h3>
        {rec.obligations.length ? (
          <ol className="mt-2 space-y-2">
            {rec.obligations.map((o, i) => (
              <li key={i} className="flex gap-3 rounded-lg border border-line px-3.5 py-2.5">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft font-mono text-[11px] font-semibold text-brand">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-[14.5px] leading-snug">{o.action}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
                    {o.deadline ? (
                      <span className="inline-flex items-center gap-1 font-medium" style={{ color: "var(--serious-text)" }}>
                        <Clock size={12} aria-hidden /> {o.deadline}
                      </span>
                    ) : null}
                    <span>{PHASES.find((p) => p.id === o.phase)?.label}</span>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-[14px] text-ink-3">No specific action required under this provision.</p>
        )}
      </section>

      {!rec.negotiation && rec.grade !== "normal" ? <GuideRequest id={rec.provision_id} /> : null}

      {rec.negotiation ? (
        <section className="rounded-xl bg-brand-soft p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[13px] font-medium text-brand">What to ask for</h3>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(rec.negotiation?.ask ?? "").then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-brand hover:underline"
            >
              {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-1 text-[15px] leading-relaxed">{rec.negotiation.ask}</p>
          <p className="mt-2 text-[13.5px] text-ink-2">
            <span className="font-medium text-ink">You can accept:</span> {rec.negotiation.minimum}
          </p>
        </section>
      ) : null}

      {rec.fact_ids.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-ink-3">Evidence</span>
          {rec.fact_ids.map((id) => (
            <RefChip key={id} id={id} onOpen={onOpen} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SourcePanel({ factIds, factById, onOpen }: { factIds: string[]; factById: (id: string) => Fact | undefined; onOpen: (id: string) => void }) {
  const facts = factIds.map(factById).filter((f): f is Fact => Boolean(f));
  const [active, setActive] = useState(0);
  const fact = facts[active];
  const src = fact?.sources[0];

  return (
    <Card className="overflow-hidden xl:sticky xl:top-20">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-[12.5px] text-ink-2">
        <FileText size={14} aria-hidden />
        <span className="min-w-0 flex-1 truncate">{src ? `${src.docName}${src.page ? ` · p.${src.page}` : ""}` : "Source"}</span>
      </div>
      {facts.length > 1 ? (
        <div className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2">
          {facts.map((f, i) => (
            <button
              key={f.id}
              onClick={() => setActive(i)}
              className={cx("rounded-md px-2 py-0.5 font-mono text-[11.5px]", i === active ? "bg-brand-soft text-brand" : "text-ink-3 hover:bg-sunken")}
            >
              {f.id}
            </button>
          ))}
        </div>
      ) : null}
      {src ? (
        <div className="paper px-5 py-5">
          <blockquote className="font-serif text-[15.5px] leading-[1.75] text-ink-2">
            {src.before ? <span className="text-ink-3">…{src.before.slice(-160)}</span> : null}
            <mark className="quote text-ink">{src.quote}</mark>
            {src.after ? <span className="text-ink-3">{src.after.slice(0, 160)}…</span> : null}
          </blockquote>
          <button onClick={() => onOpen(fact.id)} className="mt-4 text-[12.5px] font-medium text-brand hover:underline">
            Open full evidence for {fact.id}
          </button>
        </div>
      ) : (
        <p className="px-5 py-6 text-[13.5px] leading-relaxed text-ink-3">
          No clause to quote. This provision is about something the documents don&apos;t say, so ask the main contractor to confirm it in writing.
        </p>
      )}
    </Card>
  );
}

function GuideRequest({ id }: { id: string }) {
  const { state, ensure } = useGuides();
  if (!state[id]) {
    return (
      <button onClick={() => ensure(id)} className="w-full rounded-xl border border-dashed border-line-strong px-4 py-3 text-left text-[14px] font-medium text-brand hover:border-brand hover:bg-brand-soft">
        Get the negotiation guide and proposed wording
      </button>
    );
  }
  return <GuidePending state={state[id]} onRetry={() => ensure(id)} />;
}
