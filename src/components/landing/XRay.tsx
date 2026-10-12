"use client";

import { useEffect, useRef } from "react";

// The X-ray lens: dense contract wording underneath, its plain-English meaning
// on top, revealed only inside a circle that follows the pointer. When idle it
// drifts across the clauses by itself. Position lives in CSS variables, so
// moving the lens never re-renders React.

const CLAUSES = [
  {
    no: "12.3",
    legal:
      "Payment shall be made within sixty (60) days of certification, provided always that the Contractor shall not be obliged to pay any amount until and unless the Contractor has received payment of the corresponding amount from the Employer.",
    plain: "You get paid only after they get paid. Up to 81 days after you claim.",
    tag: "Pay-when-paid · void under CIPAA s.35",
    tone: "critical",
  },
  {
    no: "14.3",
    legal:
      "The Subcontractor shall only be entitled to an extension of time to the extent that the Contractor is granted a corresponding extension of time by the Employer under the Main Contract.",
    plain: "No extra time unless the employer grants it to them first, even for delays you didn't cause.",
    tag: "Back-to-back EOT · LAD RM 8,000/day",
    tone: "serious",
  },
  {
    no: "1.3",
    legal:
      "In the event of any conflict or discrepancy between the documents forming the Subcontract, the Contractor's interpretation shall prevail.",
    plain: "Every inconsistency in the paperwork gets settled their way.",
    tag: "Order of precedence",
    tone: "critical",
  },
] as const;

const R = 92; // lens radius (px)

export function XRay() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let hovering = false;
    let raf = 0;
    const place = (x: number, y: number) => {
      el.style.setProperty("--x", `${x}px`);
      el.style.setProperty("--y", `${y}px`);
    };
    const tick = (t: number) => {
      if (!hovering) {
        const { width, height } = el.getBoundingClientRect();
        const s = t / 1000;
        place(width * (0.5 + 0.33 * Math.sin(s * 0.55)), height * (0.52 + 0.36 * Math.sin(s * 0.31 + 0.8)));
      }
      raf = requestAnimationFrame(tick);
    };
    if (reduce) {
      const { width, height } = el.getBoundingClientRect();
      place(width * 0.42, height * 0.24);
    } else {
      raf = requestAnimationFrame(tick);
    }
    const move = (e: PointerEvent) => {
      hovering = true;
      const r = el.getBoundingClientRect();
      place(e.clientX - r.left, e.clientY - r.top);
    };
    const leave = () => {
      hovering = false;
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerdown", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerdown", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  const rows = (plain: boolean) =>
    CLAUSES.map((c) => (
      <div key={c.no} className="flex h-[200px] gap-3 border-b border-dashed border-line px-4 py-4 last:border-b-0 sm:h-[124px] sm:gap-4 sm:px-6">
        <span className="w-9 shrink-0 pt-0.5 font-mono text-[12px] text-ink-3">{c.no}</span>
        {plain ? (
          <div className="min-w-0">
            <p className="text-[16.5px] font-semibold leading-snug text-ink">{c.plain}</p>
            <span
              className="mt-2 inline-block rounded-full px-2 py-0.5 text-[11.5px] font-medium"
              style={{ background: `var(--${c.tone}-soft)`, color: `var(--${c.tone}-text)` }}
            >
              {c.tag}
            </span>
          </div>
        ) : (
          <p className="min-w-0 font-serif text-[13.5px] leading-[1.6] text-ink-2 sm:text-[14px]">{c.legal}</p>
        )}
      </div>
    ));

  return (
    <figure className="relative">
      <div className="absolute -inset-4 -z-10 rounded-[28px] bg-[radial-gradient(60%_60%_at_60%_40%,var(--brand-soft),transparent)]" aria-hidden />
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-28px_rgba(20,23,28,0.35)]">
        <div className="flex items-center justify-between border-b border-line px-6 py-3 font-mono text-[11.5px] text-ink-3">
          <span>Subcontract Conditions · Rev B · DRAFT</span>
          <span>p.4</span>
        </div>
        <div
          ref={box}
          className="relative cursor-none select-none"
          style={{ "--x": "50%", "--y": "30%" } as React.CSSProperties}
          aria-label="Contract clauses with a plain-English lens"
          role="img"
        >
          <div aria-hidden>{rows(false)}</div>
          <div
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--brand-soft)_70%,var(--surface))]"
            style={{ clipPath: `circle(${R}px at var(--x) var(--y))` }}
            aria-hidden
          >
            {rows(true)}
          </div>
          <div
            className="pointer-events-none absolute left-0 top-0 rounded-full border-2 border-brand shadow-[0_0_0_6px_color-mix(in_srgb,var(--brand)_12%,transparent)]"
            style={{ width: R * 2, height: R * 2, transform: `translate(calc(var(--x) - ${R}px), calc(var(--y) - ${R}px))` }}
            aria-hidden
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-2 py-0.5 text-[10.5px] font-semibold text-on-brand">
              Plain English
            </span>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-[12.5px] text-ink-3">Move over the clauses to see what they really mean.</figcaption>
      <ul className="sr-only">
        {CLAUSES.map((c) => (
          <li key={c.no}>
            Clause {c.no}: {c.plain} ({c.tag})
          </li>
        ))}
      </ul>
    </figure>
  );
}
