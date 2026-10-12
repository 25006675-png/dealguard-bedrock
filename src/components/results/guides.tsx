"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Analysis, Negotiation, ProposedChange } from "@/lib/types";

// Negotiation guides and proposed wording are generated on demand, one contract
// point at a time, and kept for the session so each is generated only once.

export type GuideState = { status: "loading" } | { status: "done"; negotiation: Negotiation; change: ProposedChange } | { status: "error"; message: string };

interface GuidesApi {
  state: Record<string, GuideState>;
  ensure: (provisionId: string) => void;
}

const GuidesContext = createContext<GuidesApi>({ state: {}, ensure: () => {} });

export const useGuides = () => useContext(GuidesContext);

/** Provides guides to the results, and hands children the analysis with finished guides merged in. */
export function GuidesProvider({ analysis, prefetch, children }: { analysis: Analysis; prefetch: string[]; children: (merged: Analysis) => ReactNode }) {
  const [state, setState] = useState<Record<string, GuideState>>({});
  const inflight = useRef(new Set<string>());

  const ensure = useCallback(
    (id: string) => {
      if (inflight.current.has(id)) return;
      const provision = analysis.reviews.flatMap((r) => r.provisions).find((p) => p.provision_id === id);
      if (!provision || provision.grade === "normal" || provision.negotiation) return;
      inflight.current.add(id);
      setState((s) => ({ ...s, [id]: { status: "loading" } }));
      const facts = analysis.facts.filter((f) => provision.fact_ids.includes(f.id));
      fetch("/api/guide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deal: analysis.deal, provision, facts }),
      })
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Couldn't prepare the guide.");
          setState((s) => ({ ...s, [id]: { status: "done", negotiation: json.negotiation, change: json.change } }));
        })
        .catch((err: unknown) => {
          inflight.current.delete(id); // allow a retry
          setState((s) => ({ ...s, [id]: { status: "error", message: err instanceof Error ? err.message : "Couldn't prepare the guide." } }));
        });
    },
    [analysis],
  );

  // Start the most important guides as soon as the results are on screen.
  const prefetchKey = prefetch.join(",");
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) prefetchKey.split(",").filter(Boolean).forEach(ensure);
    });
    return () => {
      cancelled = true;
    };
  }, [prefetchKey, ensure]);

  const merged = useMemo<Analysis>(
    () => ({
      ...analysis,
      reviews: analysis.reviews.map((r) => ({
        ...r,
        provisions: r.provisions.map((p) => {
          const g = state[p.provision_id];
          return g?.status === "done" ? { ...p, negotiation: g.negotiation, change: g.change, clause_ref: p.clause_ref ?? g.change.clause_ref } : p;
        }),
      })),
    }),
    [analysis, state],
  );

  const api = useMemo(() => ({ state, ensure }), [state, ensure]);
  return <GuidesContext.Provider value={api}>{children(merged)}</GuidesContext.Provider>;
}
