"use client";

import { Logo } from "./Logo";
import { MotionConfig } from "motion/react";
import { useEffect, useState } from "react";
import { DEFAULT_RED_LINES, sanitizeRedLines, type RedLines } from "@/lib/playbook";
import { SAMPLE_DEAL, SAMPLE_FILES } from "@/lib/sample";
import type { Analysis, AgentId, ChatMessage, PipelineEvent } from "@/lib/types";
import { ChatPanel } from "./ChatPanel";
import { EvidenceProvider } from "./evidence";
import type { NodeState } from "./PipelineScene";
import { ResultsView } from "./ResultsView";
import { RunView } from "./RunView";
import { EMPTY_FORM, formToDeal, SetupView, type DealForm } from "./SetupView";

interface Health {
  mode: "demo" | "bedrock";
  model: string;
  region: string;
}

const RED_LINES_KEY = "dealguard.redLines";

function sampleForm(redLines: RedLines): DealForm {
  return {
    packageType: SAMPLE_DEAL.packageType,
    contractValue: String(SAMPLE_DEAL.contractValue),
    fundingCommitment: String(SAMPLE_DEAL.fundingCommitment),
    advancePayment: "",
    durationWeeks: String(SAMPLE_DEAL.durationWeeks),
    context: SAMPLE_DEAL.context,
    standardForm: SAMPLE_DEAL.standardForm,
    projectType: SAMPLE_DEAL.projectType,
    stage: SAMPLE_DEAL.stage,
    marginPct: String(SAMPLE_DEAL.marginPct),
    monthlyOverhead: String(SAMPLE_DEAL.monthlyOverhead),
    redLines,
  };
}

function fetchSampleFiles() {
  return Promise.all(
    SAMPLE_FILES.map(async (name) => {
      const blob = await (await fetch(`/sample-deal/${name}`)).blob();
      return new File([blob], name, { type: name.endsWith(".csv") ? "text/csv" : "text/plain" });
    }),
  );
}

// Red lines are a per-device preference; storage can be unavailable, so fall back quietly.
function loadRedLines(): RedLines {
  try {
    const raw = window.localStorage.getItem(RED_LINES_KEY);
    return raw ? sanitizeRedLines(JSON.parse(raw)) : DEFAULT_RED_LINES;
  } catch {
    return DEFAULT_RED_LINES;
  }
}

export function DealGuardApp() {
  const [phase, setPhase] = useState<"setup" | "running" | "results">("setup");
  const [form, setFormState] = useState<DealForm>(() => ({ ...EMPTY_FORM, redLines: loadRedLines() }));
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<Partial<Record<AgentId, NodeState>>>({});
  const [details, setDetails] = useState<Partial<Record<AgentId, string>>>({});
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  // Arriving from the landing page with ?sample=1 preloads the sample deal.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("sample") !== "1") return;
    let cancelled = false;
    fetchSampleFiles().then((loaded) => {
      if (cancelled) return;
      setFormState((f) => sampleForm(f.redLines));
      setFiles(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function setForm(next: DealForm) {
    if (next.redLines !== form.redLines) {
      try {
        window.localStorage.setItem(RED_LINES_KEY, JSON.stringify(next.redLines));
      } catch {
        // storage unavailable: the red lines still apply to this session
      }
    }
    setFormState(next);
  }

  async function loadSample() {
    setLoadingSample(true);
    try {
      const loaded = await fetchSampleFiles();
      setFormState(sampleForm(form.redLines));
      setFiles(loaded);
      setError(null);
    } finally {
      setLoadingSample(false);
    }
  }

  async function analyse() {
    setError(null);
    setStatus({});
    setDetails({});
    setMessages([]);
    setPhase("running");
    window.scrollTo({ top: 0 });

    const body = new FormData();
    body.append("deal", JSON.stringify(formToDeal(form)));
    files.forEach((f) => body.append("files", f));

    try {
      const res = await fetch("/api/analyze", { method: "POST", body });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `Request failed (${res.status}).` }));
        throw new Error(err.error);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result: Analysis | null = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as PipelineEvent;
          if (event.type === "agent") {
            setStatus((s) => ({ ...s, [event.agent]: event.status }));
            if (event.detail) setDetails((d) => ({ ...d, [event.agent]: event.detail }));
          } else if (event.type === "result") {
            result = event.analysis;
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
      if (!result) throw new Error("The analysis ended without a result. Please try again.");
      setAnalysis(result);
      setPhase("results");
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("setup");
    }
  }

  const demo = health?.mode === "demo";

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen">
        <header className="no-print sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <Logo />
              {analysis && phase === "setup" ? (
                <button onClick={() => setPhase("results")} className="text-[13px] font-medium text-brand hover:underline">
                  Back to results
                </button>
              ) : null}
            </div>
            {health ? (
              <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] text-ink-2">
                <span className="size-1.5 rounded-full" style={{ background: demo ? "var(--warning)" : "var(--good)" }} aria-hidden />
                {demo ? "Demo mode" : `Bedrock · ${health.model.replace(/^anthropic\./, "")} · ${health.region}`}
              </span>
            ) : null}
          </div>
        </header>

        {phase === "setup" ? (
          <SetupView
            form={form}
            setForm={setForm}
            files={files}
            setFiles={setFiles}
            onSubmit={analyse}
            onLoadSample={loadSample}
            loadingSample={loadingSample}
            error={error}
            demo={demo}
          />
        ) : null}
        {phase === "running" ? <RunView status={status} details={details} demo={demo} /> : null}
        {phase === "results" && analysis ? (
          <EvidenceProvider analysis={analysis} files={files}>
            <ResultsView analysis={analysis} onAsk={() => setChatOpen(true)} onReset={() => setPhase("setup")} />
            <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} analysis={analysis} messages={messages} setMessages={setMessages} />
          </EvidenceProvider>
        ) : null}
      </div>
    </MotionConfig>
  );
}
