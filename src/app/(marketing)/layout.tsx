import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050514]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-[var(--foreground)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/25">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
              AI Training Portal
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-[var(--muted-foreground)] md:flex">
            <Link href="/#features" className="transition hover:text-[var(--foreground)]">
              Features
            </Link>
            <Link href="/#programs" className="transition hover:text-[var(--foreground)]">
              Programs
            </Link>
            <Link href="/pricing" className="transition hover:text-[var(--foreground)]">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] shadow-[0_0_24px_-4px_rgba(124,108,255,0.55)] transition hover:brightness-110"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-white/[0.06] py-12 text-center text-sm text-[var(--muted-foreground)]">
        <p>© {new Date().getFullYear()} AI Training Portal. All rights reserved.</p>
      </footer>
    </div>
  );
}
