"use client";

import { ArrowRight, BadgeCheck, Check, ChevronDown, Copy, FileSearch, FileWarning, Hand, Loader2, RotateCw, Wallet } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { rmCompact, VERDICT } from "@/lib/format";
import { PROVISION_BY_ID } from "@/lib/provisions";
import type { Analysis, ProvisionRecord } from "@/lib/types";
import { useEvidence } from "../evidence";
import { Card, cx } from "../ui";
import { useGuides } from "./guides";
import { GRADE_STYLE, GradeBadge } from "./shared";

/** Risky points in the order to act on them: the strategist's focus, then deal-breakers, then by cost. */
export function orderRisky(a: Analysis) {
  const all = a.reviews.flatMap((r) => r.provisions);
  const focus = a.decision?.focus ?? [];
  const rank = (p: ProvisionRecord) => {
    const f = focus.indexOf(p.provision_id);
    if (f >= 0) return f;
    return (p.grade === "deal_breaker" ? 100 : 200) - Math.min(99, (p.cost_rm ?? 0) / 100_000);
  };
  const risky = all.filter((p) => p.grade !== "normal").sort((x, y) => rank(x) - rank(y));
  const top = risky.filter((p) => focus.includes(p.provision_id) || p.grade === "deal_breaker");
  return { top, rest: risky.filter((p) => !top.includes(p)), normal: all.filter((p) => p.grade === "normal") };
}

function RiskCard({ p, index, selected, onToggle }: { p: ProvisionRecord; index: number; selected: boolean; onToggle: () => void }) {
  const { open } = useEvidence();
  const [guide, setGuide] = useState(index === 0);
  const [copied, setCopied] = useState(false);
  const g = GRADE_STYLE[p.grade];
  const n = p.negotiation;
  const sourceId = p.change?.replaces_fact_id ?? p.fact_ids[0];
  const { state, ensure } = useGuides();
  const guideState = state[p.provision_id];
  const clauseRef = p.clause_ref ?? p.change?.clause_ref;

  return (
    <Card as="article" className={cx("relative overflow-hidden transition-shadow", selected && "ring-2 ring-[color-mix(in_srgb,var(--brand)_45%,transparent)]")}>
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: g.color }} aria-hidden />
      <div className="p-5 pl-6">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
              <GradeBadge grade={p.grade} />
              <span>{PROVISION_BY_ID[p.provision_id]?.label}</span>
              {clauseRef ? <span className="font-mono">· {clauseRef}</span> : null}
            </div>
            <h3 className="mt-2 text-[19px] font-semibold leading-snug tracking-tight">{p.headline}</h3>
            {p.why ? <p className="mt-1.5 max-w-[65ch] text-[15px] leading-relaxed text-ink-2">{p.why}</p> : null}
          </div>
          <button
            onClick={onToggle}
            aria-pressed={selected}
            className={cx(
              "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors",
              selected ? "border-brand bg-brand text-on-brand" : "border-line-strong bg-surface text-ink-2 hover:border-brand hover:text-brand",
            )}
          >
            <span className={cx("grid size-4 place-items-center rounded border", selected ? "border-on-brand" : "border-line-strong")}>{selected ? <Check size={12} strokeWidth={3} aria-hidden /> : null}</span>
            {selected ? "In my changes" : "Ask for this"}
          </button>
        </div>

        <div className="mt-4 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-[1fr_1fr_auto]">
          <div className="bg-surface px-4 py-3">
            <p className="text-[11.5px] font-medium uppercase tracking-wide text-ink-3">Normal</p>
            <p className="mt-0.5 text-[14.5px]">{p.normal}</p>
          </div>
          <div className="px-4 py-3" style={{ background: g.soft }}>
            <p className="text-[11.5px] font-medium uppercase tracking-wide" style={{ color: g.text }}>
              Yours
            </p>
            <p className="mt-0.5 text-[14.5px] font-medium">{p.yours}</p>
          </div>
          {p.cost_rm ? (
            <div className="bg-surface px-4 py-3 sm:min-w-44">
              <p className="text-[11.5px] font-medium uppercase tracking-wide text-ink-3">Could cost you</p>
              <p className="mt-0.5 text-[18px] font-semibold tracking-tight">{rmCompact(p.cost_rm)}</p>
              {p.cost_note ? <p className="text-[11.5px] leading-snug text-ink-3">{p.cost_note}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            onClick={() => {
              if (!guide) ensure(p.provision_id);
              setGuide(!guide);
            }}
            className="flex items-center gap-1 text-[13.5px] font-medium text-brand hover:underline"
            aria-expanded={guide}
          >
            How to negotiate this <ChevronDown size={15} className={cx("transition-transform", guide && "rotate-180")} aria-hidden />
          </button>
          {sourceId ? (
            <button onClick={() => open(sourceId)} className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink-2 hover:text-brand">
              <FileSearch size={15} aria-hidden /> Show me the clause
            </button>
          ) : (
            <span className="text-[13px] text-ink-3">Not in your documents; ask for it to be added</span>
          )}
          {p.rule_note ? <span className="text-[12.5px] text-ink-3">Rule check: {p.rule_note}</span> : null}
        </div>

        <AnimatePresence initial={false}>
          {guide && !n ? (
            <GuidePending state={guideState} onRetry={() => ensure(p.provision_id)} />
          ) : null}
          {guide && n ? (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["Ask for", n.ask, "var(--brand-soft)", "var(--brand)"],
                    ["You can accept", n.minimum, "var(--surface-2)", "var(--ink-2)"],
                    ["Walk away if", n.walk_away, "var(--critical-soft)", "var(--critical-text)"],
                  ] as const
                ).map(([label, text, bg, fg]) => (
                  <div key={label} className="rounded-lg px-3.5 py-3" style={{ background: bg }}>
                    <dt className="text-[12px] font-semibold" style={{ color: fg }}>
                      {label}
                    </dt>
                    <dd className="mt-1 text-[14px] leading-snug">{text}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex items-start gap-3 rounded-lg border border-dashed border-line-strong px-3.5 py-3">
                <p className="flex-1 font-serif text-[15.5px] italic leading-relaxed text-ink">&ldquo;{n.script}&rdquo;</p>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(n.script).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    });
                  }}
                  className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-brand hover:underline"
                >
                  {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />} {copied ? "Copied" : "Copy what to say"}
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </Card>
  );
}

/** Shown while a guide is being generated, or if generating it failed. */
export function GuidePending({ state, onRetry }: { state: ReturnType<typeof useGuides>["state"][string] | undefined; onRetry: () => void }) {
  if (state?.status === "error") {
    return (
      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg px-3.5 py-3 text-[13.5px]" style={{ background: "var(--warning-soft)", color: "var(--warning-text)" }}>
        <span>{state.message}</span>
        <button onClick={onRetry} className="flex shrink-0 items-center gap-1 font-medium hover:underline">
          <RotateCw size={13} aria-hidden /> Retry
        </button>
      </div>
    );
  }
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3" aria-live="polite">
      {["Ask for", "You can accept", "Walk away if"].map((label, i) => (
        <div key={label} className="rounded-lg bg-surface-2 px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-3">
            {i === 0 ? <Loader2 size={12} className="animate-spin" aria-hidden /> : null}
            {label}
          </p>
          <div className="mt-2 h-2.5 w-4/5 animate-pulse rounded bg-sunken" />
          <div className="mt-1.5 h-2.5 w-3/5 animate-pulse rounded bg-sunken" />
        </div>
      ))}
      <p className="text-[12.5px] text-ink-3 sm:col-span-3">Preparing your negotiation guide from the clause…</p>
    </div>
  );
}

export function ActionPlan({
  analysis,
  selected,
  onToggle,
  goTo,
}: {
  analysis: Analysis;
  selected: Set<string>;
  onToggle: (id: string) => void;
  goTo: (tab: "changes" | "breakdown" | "cash" | "sources") => void;
}) {
  const { top, rest, normal } = orderRisky(analysis);
  const [showRest, setShowRest] = useState(false);
  const [showNormal, setShowNormal] = useState(false);
  const d = analysis.decision;
  const v = d ? VERDICT[d.verdict] : null;
  const f = analysis.funding;
  const provisions = analysis.reviews.flatMap((r) => r.provisions);
  const quotes = analysis.facts.reduce((n, x) => n + x.sources.length, 0);
  const missingDocs = analysis.intake?.missing_documents ?? [];

  return (
    <div className="mx-auto max-w-4xl pb-28">
      {/* Verdict */}
      <div>
        {v ? (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold" style={{ background: v.soft, color: v.text }}>
            <Hand size={14} aria-hidden /> {v.label}
          </span>
        ) : null}
        <h2 className="mt-3 text-[26px] font-semibold leading-tight tracking-tight sm:text-[30px]">{d?.headline ?? "Here's what to fix before you sign."}</h2>
        {d?.summary ? <p className="mt-2 max-w-[70ch] text-[16px] leading-relaxed text-ink-2">{d.summary}</p> : null}
      </div>

      {/* Proof */}
      <ul className="mt-5 flex flex-wrap gap-2 text-[13px]">
        <li className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5">
          <BadgeCheck size={14} style={{ color: "var(--good)" }} aria-hidden /> {provisions.length} of 23 contract points checked
        </li>
        <li>
          <button onClick={() => goTo("sources")} className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 hover:border-brand">
            <BadgeCheck size={14} style={{ color: "var(--good)" }} aria-hidden /> {quotes} quotes matched to your documents
          </button>
        </li>
        {missingDocs.slice(0, 2).map((m) => (
          <li key={m.name} className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: "var(--warning-soft)", color: "var(--warning-text)" }} title={m.why}>
            <FileWarning size={14} aria-hidden /> Not provided: {m.name}
          </li>
        ))}
      </ul>

      {/* Tally */}
      <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {(
          [
            ["deal_breaker", analysis.check.dealBreakers, "Deal-breakers"],
            ["unfavourable", analysis.check.unfavourable, "Worth negotiating"],
            ["normal", analysis.check.normal, "Normal for the market"],
          ] as const
        ).map(([grade, count, label]) => {
          const g = GRADE_STYLE[grade];
          return (
            <div key={grade} className="bg-surface px-4 py-3.5">
              <p className="flex items-center gap-2 text-[28px] font-semibold tracking-tight">
                <g.Icon size={20} style={{ color: g.color }} aria-hidden />
                {count}
              </p>
              <p className="text-[13px] text-ink-2">{label}</p>
            </div>
          );
        })}
      </div>

      {/* Cash */}
      {f.gap > 0 ? (
        <Card className="mt-6 overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 p-5" style={{ background: "var(--critical-soft)" }}>
            <span className="grid size-10 place-items-center rounded-xl bg-surface" style={{ color: "var(--critical)" }}>
              <Wallet size={20} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-semibold">Can you afford this job? Not on these terms.</p>
              <p className="mt-0.5 text-[14.5px] text-ink-2">
                You&apos;d need <strong className="text-ink">{rmCompact(f.peakNeed)}</strong> before payments catch up, around week {f.peakWeek}. You have{" "}
                {rmCompact(analysis.deal.fundingCommitment)}, so you&apos;re <strong style={{ color: "var(--critical-text)" }}>{rmCompact(f.gap)} short</strong>.
              </p>
            </div>
            <button onClick={() => goTo("cash")} className="flex items-center gap-1 text-[13.5px] font-medium text-brand hover:underline">
              See the cash flow <ArrowRight size={14} aria-hidden />
            </button>
          </div>
        </Card>
      ) : null}

      {/* Risky points */}
      <h3 className="mt-10 text-[20px] font-semibold tracking-tight">Fix these first</h3>
      <p className="mt-1 text-[14px] text-ink-2">Tick the ones you want to ask for. We&apos;ll turn them into proposed contract changes and a reply letter.</p>
      <div className="mt-4 space-y-4">
        {top.map((p, i) => (
          <RiskCard key={p.provision_id} p={p} index={i} selected={selected.has(p.provision_id)} onToggle={() => onToggle(p.provision_id)} />
        ))}
      </div>

      {rest.length ? (
        <div className="mt-8">
          <button onClick={() => setShowRest(!showRest)} className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-5 py-3.5 text-left hover:bg-surface-2" aria-expanded={showRest}>
            <span>
              <span className="text-[16px] font-semibold">Also worth asking</span>
              <span className="ml-2 text-[13.5px] text-ink-3">{rest.length} points · ask if you have room, concede if needed</span>
            </span>
            <ChevronDown size={18} className={cx("text-ink-3 transition-transform", showRest && "rotate-180")} aria-hidden />
          </button>
          {showRest ? (
            <div className="mt-4 space-y-4">
              {rest.map((p, i) => (
                <RiskCard key={p.provision_id} p={p} index={i + 1} selected={selected.has(p.provision_id)} onToggle={() => onToggle(p.provision_id)} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {normal.length ? (
        <div className="mt-4">
          <button onClick={() => setShowNormal(!showNormal)} className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-5 py-3.5 text-left hover:bg-surface-2" aria-expanded={showNormal}>
            <span>
              <span className="text-[16px] font-semibold">Looks normal</span>
              <span className="ml-2 text-[13.5px] text-ink-3">{normal.length} points · usual for Malaysian subcontracts</span>
            </span>
            <ChevronDown size={18} className={cx("text-ink-3 transition-transform", showNormal && "rotate-180")} aria-hidden />
          </button>
          {showNormal ? (
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-surface">
              {normal.map((p) => (
                <li key={p.provision_id} className="flex items-start gap-3 px-5 py-3">
                  <GRADE_STYLE.normal.Icon size={16} className="mt-0.5 shrink-0" style={{ color: "var(--good)" }} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-medium">{p.headline}</p>
                    <p className="text-[13px] text-ink-3">{p.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* Sticky action bar */}
      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <p className="text-[14px]">
            <span className="font-semibold">{selected.size}</span> change{selected.size === 1 ? "" : "s"} selected
          </p>
          <button
            onClick={() => goTo("changes")}
            disabled={!selected.size}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-5 text-[14.5px] font-medium text-on-brand hover:bg-brand-hover disabled:opacity-50"
          >
            Review proposed changes <ArrowRight size={16} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
