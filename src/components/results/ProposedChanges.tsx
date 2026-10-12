"use client";

import { ArrowLeft, Banknote, Check, Copy, Download, FileText, Loader2, Mail, Plus, ScrollText, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { changeRows, downloadAmendmentsDocx, downloadLetterDocx, letterMarkdown } from "@/lib/export";
import type { DraftKind } from "@/lib/prompts";
import type { Analysis } from "@/lib/types";
import { useEvidence } from "../evidence";
import { Button, Card, CardHeader, cx, Sheet } from "../ui";
import { GuidePending, orderRisky } from "./ActionPlan";
import { useGuides } from "./guides";
import { GradeBadge } from "./shared";

const AI_DRAFTS: { kind: DraftKind; title: string; blurb: string; Icon: typeof Mail }[] = [
  { kind: "notice_templates", title: "Notice templates", blurb: "Delay, variation and late-payment notices with this contract's deadlines.", Icon: ScrollText },
  { kind: "financing_pack", title: "Financing pack", blurb: "A one-page summary for your bank or an invoice-financing provider.", Icon: Banknote },
];

function useCopy() {
  const [copied, setCopied] = useState(false);
  return {
    copied,
    copy: (text: string) =>
      navigator.clipboard?.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }),
  };
}

export function ProposedChanges({
  analysis,
  selected,
  onToggle,
  goBack,
}: {
  analysis: Analysis;
  selected: Set<string>;
  onToggle: (id: string) => void;
  goBack: () => void;
}) {
  const { open } = useEvidence();
  const { top, rest } = orderRisky(analysis);
  const ordered = [...top, ...rest];
  const chosen = ordered.filter((p) => selected.has(p.provision_id));
  const notChosen = ordered.filter((p) => !selected.has(p.provision_id));
  const rows = changeRows(analysis, chosen);
  const { state: guideState, ensure } = useGuides();
  const pending = chosen.filter((p) => !p.change);
  // Every ticked point needs its wording; ensure() is a no-op for ones already requested.
  const pendingKey = pending.map((p) => p.provision_id).join(",");
  useEffect(() => {
    Promise.resolve().then(() => pendingKey.split(",").filter(Boolean).forEach(ensure));
  }, [pendingKey, ensure]);
  const byId = new Map(chosen.map((p) => [p.provision_id, p]));
  const [letterOpen, setLetterOpen] = useState(false);
  const [busy, setBusy] = useState<"schedule" | "letter" | null>(null);
  const [draft, setDraft] = useState<{ kind: DraftKind; text: string; busy: boolean } | null>(null);
  const letter = letterMarkdown(analysis, chosen);
  const letterCopy = useCopy();
  const draftCopy = useCopy();

  async function run(which: "schedule" | "letter") {
    setBusy(which);
    try {
      if (which === "schedule") await downloadAmendmentsDocx(analysis, chosen);
      else await downloadLetterDocx(letter);
    } finally {
      setBusy(null);
    }
  }

  async function generate(kind: DraftKind) {
    setDraft({ kind, text: "", busy: true });
    try {
      const res = await fetch("/api/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, analysis }) });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? "Drafting is unavailable.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setDraft((cur) => (cur?.kind === kind ? { ...cur, text: snapshot } : cur));
      }
    } catch (e) {
      setDraft((cur) => (cur ? { ...cur, text: `⚠ ${e instanceof Error ? e.message : "Something went wrong."}` } : cur));
    } finally {
      setDraft((cur) => (cur ? { ...cur, busy: false } : cur));
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={goBack} className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink-2 hover:text-ink">
        <ArrowLeft size={15} aria-hidden /> Back to action plan
      </button>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight">Your proposed changes</h2>
          <p className="mt-1 text-[15px] text-ink-2">
            {rows.length} clause change{rows.length === 1 ? "" : "s"}
            {pending.length ? `, ${pending.length} still being prepared` : ""}. Send these back with your reply instead of signing as-is.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setLetterOpen(true)} disabled={!chosen.length || pending.length > 0}>
            <Mail size={15} aria-hidden /> Reply letter
          </Button>
          <Button variant="primary" onClick={() => run("schedule")} disabled={!rows.length || pending.length > 0 || busy === "schedule"}>
            {busy === "schedule" ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Download size={15} aria-hidden />} Schedule of amendments (Word)
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <AnimatePresence initial={false}>
          {rows.map((r) => {
            const rec = byId.get(r.provisionId)!;
            return (
              <motion.div key={r.provisionId} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
                <Card as="article">
                  <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
                        <span className="font-mono">{r.no}.</span> <span className="font-mono">{r.clause}</span> · {r.title} <GradeBadge grade={rec.grade} />
                      </p>
                      <p className="mt-1 text-[15.5px] font-semibold">{rec.headline}</p>
                    </div>
                    <button onClick={() => onToggle(r.provisionId)} className="rounded-md p-1.5 text-ink-3 hover:bg-sunken hover:text-ink" aria-label={`Remove ${r.title}`} title="Remove from my changes">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="space-y-3 px-5 py-4">
                    {r.original ? (
                      <div>
                        <p className="flex items-center justify-between text-[11.5px] font-medium uppercase tracking-wide text-ink-3">
                          Your contract says
                          {rec.change?.replaces_fact_id ? (
                            <button onClick={() => open(rec.change!.replaces_fact_id!)} className="normal-case tracking-normal text-brand hover:underline">
                              See it in the document
                            </button>
                          ) : null}
                        </p>
                        <p className="mt-1 rounded-lg px-3 py-2 font-serif text-[15px] leading-relaxed line-through decoration-[var(--critical)] decoration-1" style={{ background: "var(--critical-soft)" }}>
                          {r.original}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[13px] text-ink-3">Your contract doesn&apos;t cover this. Proposed new wording:</p>
                    )}
                    <div>
                      <p className="text-[11.5px] font-medium uppercase tracking-wide text-ink-3">Proposed wording</p>
                      <p className="mt-1 rounded-lg px-3 py-2 font-serif text-[15px] leading-relaxed underline decoration-[var(--good)] decoration-1 underline-offset-4" style={{ background: "var(--good-soft)" }}>
                        {r.proposed}
                      </p>
                    </div>
                    {rec.negotiation ? (
                      <p className="text-[13px] text-ink-2">
                        <span className="font-medium text-ink">If they refuse, you can accept:</span> {rec.negotiation.minimum}
                      </p>
                    ) : null}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {pending.map((p) => (
          <Card key={p.provision_id} as="article" className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[12.5px] text-ink-3">
                  <GradeBadge grade={p.grade} /> {p.clause_ref ?? ""}
                </p>
                <p className="mt-1 text-[15.5px] font-semibold">{p.headline}</p>
              </div>
              <button onClick={() => onToggle(p.provision_id)} className="rounded-md p-1.5 text-ink-3 hover:bg-sunken hover:text-ink" aria-label={`Remove ${p.headline}`}>
                <X size={16} />
              </button>
            </div>
            <GuidePending state={guideState[p.provision_id]} onRetry={() => ensure(p.provision_id)} />
          </Card>
        ))}
        {!rows.length && !pending.length ? (
          <Card className="p-8 text-center text-[14.5px] text-ink-2">No changes selected yet. Go back to the action plan and tick the points you want to ask for.</Card>
        ) : null}
      </div>

      {notChosen.length ? (
        <Card className="mt-6">
          <CardHeader title="Add more changes" hint="Other points worth negotiating" />
          <ul className="divide-y divide-line">
            {notChosen.map((p) => (
              <li key={p.provision_id} className="flex items-center gap-3 px-5 py-2.5">
                <GradeBadge grade={p.grade} />
                <span className="min-w-0 flex-1 truncate text-[14px]">{p.headline}</span>
                <button onClick={() => onToggle(p.provision_id)} className="flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
                  <Plus size={14} aria-hidden /> Add
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader title="Other documents" hint="Written by Claude from your analysis. Review before sending." />
        <ul className="divide-y divide-line">
          {AI_DRAFTS.map((x) => (
            <li key={x.kind}>
              <button onClick={() => generate(x.kind)} className="group flex w-full items-start gap-3 px-5 py-3.5 text-left hover:bg-surface-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                  <x.Icon size={17} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-medium group-hover:text-brand">{x.title}</span>
                  <span className="block text-[13px] leading-snug text-ink-3">{x.blurb}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <p className="mt-6 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-3">
        <FileText size={14} className="mt-px shrink-0" aria-hidden />
        Proposed wording is drafted by AI for discussion with the main contractor. Commercial guidance only, not legal advice; have a lawyer check it before you sign.
      </p>

      <Sheet open={letterOpen} onClose={() => setLetterOpen(false)} width={720} title="Reply to the Letter of Award">
        <div className="flex h-full flex-col">
          <div className="draft flex-1 overflow-y-auto px-6 py-5">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{letter}</ReactMarkdown>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
            <p className="text-[12px] text-ink-3">Fill in the [placeholders] and attach the schedule of amendments.</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => letterCopy.copy(letter)}>
                {letterCopy.copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {letterCopy.copied ? "Copied" : "Copy"}
              </Button>
              <Button size="sm" variant="primary" onClick={() => run("letter")} disabled={busy === "letter"}>
                {busy === "letter" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Download size={14} aria-hidden />} Word
              </Button>
            </div>
          </div>
        </div>
      </Sheet>

      <Sheet
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        width={720}
        title={
          <span className="flex items-center gap-2">
            {AI_DRAFTS.find((x) => x.kind === draft?.kind)?.title}
            {draft?.busy ? <Loader2 size={15} className="animate-spin text-ink-3" aria-label="Writing" /> : null}
          </span>
        }
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {draft?.text ? (
              <div className={cx("draft", draft.busy && "draft-busy")}>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{draft.text}</ReactMarkdown>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-ink-3">
                <Loader2 size={15} className="animate-spin" aria-hidden /> Drafting from your analysis…
              </p>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
            <Button size="sm" disabled={!draft?.text || draft.busy} onClick={() => draftCopy.copy(draft?.text ?? "")}>
              {draftCopy.copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {draftCopy.copied ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" variant="primary" disabled={!draft?.text || draft.busy} onClick={() => draft && downloadLetterDocx(draft.text, `dealguard-${draft.kind.replace(/_/g, "-")}.docx`)}>
              <Download size={14} aria-hidden /> Word
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
