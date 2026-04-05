"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Gauge, Layers, ShieldCheck } from "lucide-react";

const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export function HeroSection({
  showSelfServeBilling = true,
}: {
  /** When false, avoid implying live self-serve billing is available. */
  showSelfServeBilling?: boolean;
}) {
  return (
    <div className="relative">
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
        <motion.div
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.08 }}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.p
            variants={fade}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]"
          >
            Structured · Measurable · Executive-grade
          </motion.p>
          <motion.h1
            variants={fade}
            className="font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.05] tracking-tight text-[var(--foreground)] sm:text-5xl md:text-6xl"
          >
            Master AI agents with{" "}
            <span className="bg-gradient-to-r from-[#a78bfa] via-[#7c6cff] to-[#38bdf8] bg-clip-text text-transparent">
              clarity and rigor
            </span>
          </motion.h1>
          <motion.p
            variants={fade}
            className="mb-10 mt-6 text-lg leading-relaxed text-[var(--muted-foreground)] sm:text-xl"
          >
            A 12-week AI Agent Mastery path with Azure, Hugging Face, and Cursor tracks. Real
            progress, certificates, and reporting—built for teams who ship.
            {!showSelfServeBilling && (
              <span className="block mt-2 text-base">
                Access is currently by invitation or administrator assignment—public self-serve
                enrollment is not available yet.
              </span>
            )}
          </motion.p>
          <motion.div
            variants={fade}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-8 py-3.5 text-sm font-semibold text-[var(--accent-foreground)] shadow-[0_0_40px_-8px_rgba(124,108,255,0.65)] transition hover:brightness-110 sm:w-auto"
            >
              Create account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/12 bg-white/[0.03] px-8 py-3.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-white/[0.06] sm:w-auto"
            >
              View pricing
            </Link>
          </motion.div>
        </motion.div>

        <div
          id="features"
          className="mt-28 grid gap-6 border-t border-white/[0.06] pt-20 sm:grid-cols-3"
        >
          {[
            {
              icon: Layers,
              title: "Layered curriculum",
              body: "Programs, modules, and lessons with durations, resources, and external links—stored in DB, not slides.",
            },
            {
              icon: Gauge,
              title: "Real progress",
              body: "Completion %, time spent, streaks, and certificates—computed from learner activity.",
            },
            {
              icon: ShieldCheck,
              title: "Entitlements first",
              body: showSelfServeBilling
                ? "Access follows paid state via webhooks and grants—never trust the client alone."
                : "Access follows server-side entitlements and administrator grants—never trust the client alone.",
            },
          ].map((item) => (
            <div key={item.title} className="glass-panel rounded-2xl p-8">
              <item.icon className="mb-4 h-8 w-8 text-[var(--accent)]" aria-hidden />
              <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        <div id="programs" className="mt-24 space-y-6 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
            AI Agent Mastery
          </h2>
          <p className="mx-auto max-w-2xl text-[var(--muted-foreground)]">
            Twelve weekly milestones. Azure AI services, Hugging Face workflows, and Cursor-powered
            agent development—aligned to how teams actually build.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Sign in to open the library
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
