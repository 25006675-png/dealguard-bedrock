"use client";

import { useInView } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { AgentId } from "@/lib/types";
import type { NodeState } from "../PipelineScene";

const PipelineScene = dynamic(() => import("../PipelineScene"), { ssr: false });

const STAGES: AgentId[][] = [["intake", "facts"], ["payment", "scope", "time", "remedies", "consistency"], ["scoring", "funding"], ["decision"]];

// Frames: each stage runs, then completes; a pause at the end, then it starts again.
function frame(step: number): { status: Partial<Record<AgentId, NodeState>>; done: boolean } {
  const status: Partial<Record<AgentId, NodeState>> = {};
  const stage = Math.floor(step / 2);
  STAGES.forEach((agents, i) => {
    const s: NodeState = i < stage ? "done" : i === stage ? (step % 2 === 0 ? "running" : "done") : "idle";
    agents.forEach((a) => (status[a] = s));
  });
  return { status, done: stage >= STAGES.length };
}

export function PipelineDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "200px" });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setStep((s) => (s + 1) % (STAGES.length * 2 + 3)), 1300);
    return () => clearInterval(id);
  }, [inView]);

  const { status, done } = frame(step);
  return (
    <div ref={ref} className="paper relative h-[380px] overflow-hidden rounded-2xl border border-line bg-surface sm:h-[440px]">
      {inView ? <PipelineScene status={status} advisorReady={done} className="h-full w-full" /> : null}
    </div>
  );
}
