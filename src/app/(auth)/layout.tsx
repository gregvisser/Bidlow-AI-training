import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(124,108,255,0.25),transparent_70%)]" />
        <div className="absolute -right-40 bottom-20 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.15),transparent_70%)]" />
      </div>
      <Link
        href="/"
        className="relative z-10 mb-10 flex items-center gap-2 text-[var(--foreground)]"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/25">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
          AI Training Portal
        </span>
      </Link>
      <div className="relative z-10 w-full max-w-md glass-panel rounded-2xl p-8 sm:p-10">{children}</div>
    </div>
  );
}
