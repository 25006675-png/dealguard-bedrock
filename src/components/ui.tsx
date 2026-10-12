"use client";

import { AlertOctagon, AlertTriangle, CircleAlert, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { SEVERITY } from "@/lib/format";
import type { Severity } from "@/lib/types";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const SEVERITY_ICON = { critical: AlertOctagon, high: AlertTriangle, medium: CircleAlert, low: Info } as const;

export function SeverityBadge({ severity, compact }: { severity: Severity; compact?: boolean }) {
  const s = SEVERITY[severity];
  const Icon = SEVERITY_ICON[severity];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: s.soft, color: s.text }}
    >
      <Icon size={13} strokeWidth={2.25} style={{ color: s.color }} aria-hidden />
      {compact ? null : s.label}
      {compact ? <span className="sr-only">{s.label}</span> : null}
    </span>
  );
}

export function Card({ children, className, as: As = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <As className={cx("rounded-xl border border-line bg-surface", className)}>{children}</As>;
}

export function CardHeader({ title, hint, action }: { title: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
      <div>
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {hint ? <p className="mt-0.5 text-[13px] text-ink-3">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; size?: "sm" | "md" };

export function Button({ variant = "secondary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "md" ? "h-10 px-4 text-sm" : "h-8 px-3 text-[13px]",
        variant === "primary" && "bg-brand text-on-brand hover:bg-brand-hover",
        variant === "secondary" && "border border-line-strong bg-surface text-ink hover:bg-surface-2",
        variant === "ghost" && "text-ink-2 hover:bg-sunken hover:text-ink",
        className,
      )}
    />
  );
}

/** Clickable evidence reference: F07 (fact), G02 (gap) or PAY-2 (finding). */
export function RefChip({ id, label, onOpen }: { id: string; label?: string; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-2 px-1.5 py-px align-baseline font-mono text-[11.5px] font-medium text-brand hover:border-brand hover:bg-brand-soft"
      title={label ? `${id} · ${label}` : `View source for ${id}`}
    >
      {id}
      {label ? <span className="max-w-40 truncate font-sans font-normal text-ink-2">{label}</span> : null}
    </button>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="scrim"
            className="no-print fixed inset-0 z-40 bg-black/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            key="sheet"
            role="dialog"
            aria-modal="true"
            className="no-print fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-line bg-surface shadow-2xl"
            style={{ maxWidth: width }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
              <div className="min-w-0 text-[15px] font-semibold">{title}</div>
              <button onClick={onClose} className="rounded-md p-1.5 text-ink-3 hover:bg-sunken hover:text-ink" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="text-[13px] font-medium text-ink-3">{children}</p>;
}
