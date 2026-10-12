"use client";

import { ArrowUp, Loader2 } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import type { Analysis, ChatMessage } from "@/lib/types";
import { useEvidence } from "./evidence";
import { RefChip, Sheet } from "./ui";

const SUGGESTIONS = ["What should I negotiate first?", "Can I afford this job on these payment terms?", "How exposed am I to LAD and delays?"];
const REF = /\[((?:[A-Z]{2,4}-\d+)|(?:[FG]\d{1,3}))\]/g;

function inline(text: string, onOpen: (id: string) => void): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(REF)) {
    out.push(...bold(text.slice(last, m.index), `t${last}`));
    const raw = m[1];
    const id = /^[FG]\d+$/.test(raw) ? `${raw[0]}${raw.slice(1).padStart(2, "0")}` : raw;
    out.push(<RefChip key={`${m.index}-${id}`} id={id} onOpen={onOpen} />);
    last = (m.index ?? 0) + m[0].length;
  }
  out.push(...bold(text.slice(last), `t${last}`));
  return out;
}

function bold(s: string, keyPrefix: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong> : <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>,
  );
}

function Rich({ text, onOpen }: { text: string; onOpen: (id: string) => void }) {
  return (
    <div className="space-y-2.5">
      {text.split(/\n{2,}/).map((block, i) => {
        const lines = block.split("\n").filter(Boolean);
        if (lines.length && lines.every((l) => /^\s*([-•*]|\d+\.)\s+/.test(l))) {
          return (
            <ul key={i} className="ml-4 list-disc space-y-1">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*([-•*]|\d+\.)\s+/, ""), onOpen)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j ? <br /> : null}
                {inline(l.replace(/^#+\s*/, ""), onOpen)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function ChatPanel({
  open,
  onClose,
  analysis,
  messages,
  setMessages,
}: {
  open: boolean;
  onClose: () => void;
  analysis: Analysis;
  messages: ChatMessage[];
  setMessages: (fn: (m: ChatMessage[]) => ChatMessage[]) => void;
}) {
  const { open: openRef } = useEvidence();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setDraft("");
    setBusy(true);
    const history: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(() => [...history, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ analysis, messages: history }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "The advisor is unavailable." }));
        throw new Error(err.error);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: snapshot }]);
      }
    } catch (e) {
      setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: `⚠ ${e instanceof Error ? e.message : "Something went wrong."}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} width={480} title="Ask DealGuard">
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {!messages.length ? (
            <div>
              <p className="text-[14px] leading-relaxed text-ink-2">
                Ask about risks, payment, what to negotiate or what to request. Answers come from this analysis and cite the clause IDs you can click.
              </p>
              <div className="mt-4 flex flex-col items-start gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-line-strong px-3 py-1.5 text-left text-[13px] hover:border-brand hover:bg-brand-soft">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="ml-10 rounded-2xl rounded-br-md bg-brand px-3.5 py-2.5 text-[14px] text-on-brand">
                {m.content}
              </div>
            ) : (
              <div key={i} className="text-[14px] leading-relaxed">
                {m.content ? <Rich text={m.content} onOpen={openRef} /> : <Loader2 size={16} className="animate-spin text-ink-3" aria-label="Thinking" />}
              </div>
            ),
          )}
          <div ref={end} />
        </div>
        <form
          className="border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <div className="flex items-end gap-2 rounded-xl border border-line-strong bg-surface px-3 py-2 focus-within:border-brand">
            <textarea
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              placeholder="Ask a follow-up question"
              className="max-h-32 flex-1 resize-none bg-transparent py-1 text-[14px] outline-none"
            />
            <button type="submit" disabled={busy || !draft.trim()} className="grid size-8 place-items-center rounded-lg bg-brand text-on-brand disabled:opacity-40" aria-label="Send">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-ink-3">Commercial guidance only, not legal advice.</p>
        </form>
      </div>
    </Sheet>
  );
}
