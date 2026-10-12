"use client";

import { ArrowRight, Banknote, Clock, FileText, Mail, Plus, ScrollText } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { checkPlaybook } from "@/lib/playbook";
import { GROUPS, PROVISIONS } from "@/lib/provisions";
import { SAMPLE_DEAL, SAMPLE_TERMS } from "@/lib/sample";
import { Logo } from "../Logo";
import { CHECK_STYLE } from "../results/shared";
import { CashCliff } from "./CashCliff";
import { PipelineDemo } from "./PipelineDemo";
import { XRay } from "./XRay";

const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
} as const;

function CTA({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <Link href="/app?sample=1" className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-5 text-[15px] font-medium text-on-brand transition-colors hover:bg-brand-hover">
        Try the sample deal <ArrowRight size={16} aria-hidden />
      </Link>
      <Link href="/app" className="inline-flex h-12 items-center rounded-xl border border-line-strong bg-surface px-5 text-[15px] font-medium hover:bg-surface-2">
        Review your own deal
      </Link>
    </div>
  );
}

function SectionHead({ title, lede }: { title: ReactNode; lede?: string }) {
  return (
    <motion.div {...reveal} className="max-w-2xl">
      <h2 className="text-[30px] font-semibold leading-tight tracking-tight sm:text-[38px]">{title}</h2>
      {lede ? <p className="mt-3 text-[17px] leading-relaxed text-ink-2">{lede}</p> : null}
    </motion.div>
  );
}

function Tile({ title, body, children, className = "" }: { title: string; body: string; children: ReactNode; className?: string }) {
  return (
    <motion.article {...reveal} className={`flex flex-col overflow-hidden rounded-2xl border border-line bg-surface ${className}`}>
      <div className="flex-1 border-b border-line bg-surface-2 p-5">{children}</div>
      <div className="p-5">
        <h3 className="text-[16px] font-semibold">{title}</h3>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{body}</p>
      </div>
    </motion.article>
  );
}

const FAQ = [
  ["Is this legal advice?", "No. DealGuard is commercial decision support: it shows what the documents say, what that means for your cash and time, and what to ask for. For anything you're about to rely on in a dispute, have a construction lawyer review it."],
  ["Where do my documents go?", "They're sent to Claude on Amazon Bedrock in the AWS account that runs DealGuard, analysed, and not stored by DealGuard. The results live in your browser session."],
  ["How do I know it isn't making things up?", "Every fact in the ledger carries a quote that Bedrock's citations feature returns straight from your document, with the page. Click any reference to see the clause in context."],
  ["Which documents work?", "PDF works best. Word, CSV and text files work, and so do photos of pages. Save Excel BQs as PDF or CSV first."],
  ["How long does it take, and what does it cost to run?", "About three minutes for a typical package. Each review makes eight Claude calls; at list prices that's roughly US$0.30–1.50 of AWS usage for a 3–5 document package."],
];

export function Landing() {
  const checks = checkPlaybook(SAMPLE_TERMS, SAMPLE_DEAL.redLines).filter((c) => c.status === "breach").slice(0, 3);

  return (
    <div className="min-h-screen overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-[14px] text-ink-2 md:flex" aria-label="Sections">
            <a href="#product" className="hover:text-ink">Product</a>
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#malaysia" className="hover:text-ink">Malaysian rules</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
          </nav>
          <Link href="/app" className="inline-flex h-9 items-center rounded-lg bg-ink px-3.5 text-[13.5px] font-medium text-[var(--bg)] hover:opacity-90">
            Open DealGuard
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="paper relative border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-[42px] font-semibold leading-[1.04] tracking-[-0.03em] sm:text-[58px]"
            >
              Read the contract before it reads your bank balance.
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.6 }} className="mt-6 max-w-xl text-[18px] leading-relaxed text-ink-2">
              DealGuard breaks your Letter of Award and subcontract into 23 provisions: what each one says, what you must do and by when, and what to ask for. Then it
              stress-tests your cash flow before you sign.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.6 }}>
              <CTA className="mt-8" />
              <p className="mt-6 text-[13px] text-ink-3">For Malaysian trade subcontractors · CIPAA 2012 checks · every point linked to the clause</p>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 24, rotate: 1.2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
            <XRay />
          </motion.div>
        </div>
      </section>

      {/* The cash cliff */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHead
            title={
              <>
                A RM 2.4M job. RM 300k in the bank.
                <br />
                <span className="text-ink-3">Here&apos;s what the payment terms do.</span>
              </>
            }
            lede="This is the sample deal, run through DealGuard's cash model: monthly claims, 21 days to certify, 60 days to pay, retention on top. Scroll to watch the cash go."
          />
          <div className="mt-12">
            <CashCliff />
          </div>
        </div>
      </section>

      {/* Product bento */}
      <section id="product" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHead title="Everything a commercial manager would check. In plain English." lede="Built for the owner who signs the LOA, not for a legal department." />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <Tile className="md:col-span-2" title="Contract breakdown" body="23 provisions across six areas, each with what it says, what you must do, the risk and the ask. Step through them like a checklist.">
              <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <ul className="space-y-1 text-[12.5px]">
                  {GROUPS.slice(2, 4).flatMap((g) => PROVISIONS.filter((p) => p.group === g.id).slice(0, 3)).map((p, i) => (
                    <li key={p.id} className={`flex items-center gap-2 rounded-md px-2 py-1 ${i === 2 ? "border border-line bg-surface font-medium" : "text-ink-2"}`}>
                      <span className="size-2 rounded-full" style={{ background: ["var(--warning)", "var(--serious)", "var(--critical)", "var(--serious)", "var(--serious)", "var(--warning)"][i] }} />
                      {p.label}
                    </li>
                  ))}
                </ul>
                <div className="rounded-lg border border-line bg-surface p-3.5 text-[12.5px]">
                  <p className="font-semibold text-[14px]">Conditional payment</p>
                  <p className="mt-1 text-ink-2">Payment depends on the main contractor being paid by the employer.</p>
                  <p className="mt-2.5 text-[11.5px] font-medium text-ink-3">What you must do</p>
                  <p className="mt-0.5">Reply in writing that the condition is void under CIPAA s.35 if payment is held back.</p>
                  <p className="mt-2.5 rounded-md bg-brand-soft px-2 py-1.5">
                    <span className="font-medium text-brand">Ask: </span>Delete the pay-when-paid proviso.
                  </p>
                </div>
              </div>
            </Tile>
            <Tile title="Every deadline" body="Notices, time bars and conditions precedent, in the order you'll meet them. Download it as a checklist.">
              <ul className="space-y-2 text-[12.5px]">
                {[
                  ["Sign and return the LOA", "within 3 days"],
                  ["Notice of delay event", "within 7 days of the event"],
                  ["Submit variation claim", "within 14 days of instruction"],
                ].map(([a, d]) => (
                  <li key={a} className="rounded-lg border border-line bg-surface px-3 py-2">
                    <p>{a}</p>
                    <p className="mt-0.5 flex items-center gap-1 font-medium" style={{ color: "var(--serious-text)" }}>
                      <Clock size={11} aria-hidden /> {d}
                    </p>
                  </li>
                ))}
              </ul>
            </Tile>
            <Tile title="Your red lines, checked" body="Set your limits once. Every deal is measured against them, and against CIPAA 2012 defaults.">
              <ul className="space-y-1.5 text-[12.5px]">
                {checks.map((c) => {
                  const s = CHECK_STYLE[c.status];
                  return (
                    <li key={c.id} className="flex items-start gap-2 rounded-lg border border-line bg-surface px-3 py-2">
                      <s.Icon size={14} className="mt-px shrink-0" style={{ color: s.color }} aria-hidden />
                      <span>
                        <span className="font-medium">{c.label}</span>
                        <span className="block text-ink-3">
                          {c.rule} · <span style={{ color: s.text }}>{c.actual}</span>
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Tile>
            <Tile title="Click any point, see the clause" body="Quotes come back from your document through Bedrock citations, with the page. Nothing paraphrased, nothing invented.">
              <div className="rounded-lg border border-line bg-surface">
                <p className="flex items-center gap-1.5 border-b border-line px-3 py-1.5 text-[11.5px] text-ink-3">
                  <FileText size={12} aria-hidden /> Subcontract_Conditions_RevB · cl. 9.3
                </p>
                <p className="px-3 py-2.5 font-serif text-[13.5px] leading-relaxed text-ink-2">
                  …<mark className="quote text-ink">submitted within fourteen (14) days of the instruction, failing which the Subcontractor shall be deemed to have waived its entitlement</mark>.
                </p>
              </div>
            </Tile>
            <Tile title="Documents ready to send" body="A negotiation letter, notice templates with this contract's deadlines, and a financing pack for your bank.">
              <ul className="space-y-2 text-[13px]">
                {[
                  [Mail, "Negotiation letter"],
                  [ScrollText, "Notice templates"],
                  [Banknote, "Financing pack"],
                ].map(([Icon, label]) => {
                  const I = Icon as typeof Mail;
                  return (
                    <li key={label as string} className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2">
                      <span className="grid size-7 place-items-center rounded-md bg-brand-soft text-brand">
                        <I size={14} aria-hidden />
                      </span>
                      {label as string}
                    </li>
                  );
                })}
              </ul>
            </Tile>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHead title="Eight specialists read it at once." lede="One for each area a commercial manager would check, running in parallel on Claude in Amazon Bedrock. Your red lines and the cash maths are plain rules you can check." />
            <ol className="mt-8 space-y-5">
              {[
                ["Read", "Intake classifies every document; the fact ledger pulls each commercial term with its quote and page."],
                ["Review", "Payment, scope, time, remedies and consistency specialists fill in the 23-provision breakdown."],
                ["Decide", "Your red lines, the cash model and a strategist turn it into a verdict, asks and ready-to-send drafts."],
              ].map(([t, d], i) => (
                <motion.li key={t} {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }} className="flex gap-4">
                  <span className="mt-0.5 font-mono text-[13px] text-ink-3">0{i + 1}</span>
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="mt-0.5 text-[14.5px] leading-relaxed text-ink-2">{d}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
          <motion.div {...reveal}>
            <PipelineDemo />
          </motion.div>
        </div>
      </section>

      {/* Malaysia */}
      <section id="malaysia" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHead title="Knows the rules your contracts run on." lede="Built around Malaysian subcontract practice: the statutes, standard forms and habits that decide whether you get paid." />
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["CIPAA 2012", "Flags pay-when-paid terms (void under s.35), benchmarks payment against the s.36 default terms, and keeps your adjudication and suspension rights in view."],
              ["LAD and time", "Spots uncapped LAD, extra indemnities for the employer's LAD, and EOT that only flows if the employer grants it upstream."],
              ["Standard forms", "Reads PAM 2018, CIDB 2022 and PWD 203A subcontracts, and the bespoke conditions main contractors write themselves."],
              ["Retention and bonds", "Catches retention released on the main contract's milestones instead of yours, and on-demand bonds that outlive your works."],
            ].map(([t, d], i) => (
              <motion.div key={t} {...reveal} transition={{ ...reveal.transition, delay: i * 0.06 }} className="bg-surface p-6">
                <p className="font-semibold">{t}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHead title="Questions owners ask" />
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium">
                  {q}
                  <Plus size={18} className="shrink-0 text-ink-3 transition-transform group-open:rotate-45" aria-hidden />
                </summary>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="paper">
        <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
          <motion.h2 {...reveal} className="mx-auto max-w-3xl text-[34px] font-semibold leading-tight tracking-tight sm:text-[46px]">
            Your next Letter of Award deserves a second reader.
          </motion.h2>
          <CTA className="mt-8 justify-center" />
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-[13px] text-ink-3 sm:px-6">
          <Logo />
          <p>Commercial guidance only, not legal advice. Sample documents are fictional. Built on Claude in Amazon Bedrock.</p>
        </div>
      </footer>
    </div>
  );
}
