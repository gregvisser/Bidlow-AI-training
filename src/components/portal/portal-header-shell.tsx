"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Sparkles } from "lucide-react";
import { SignOutButton } from "@/components/portal/sign-out-button";
import { Button } from "@/components/ui/button";
import { adminNavItems, learnerNavItems } from "@/lib/portal-nav";

export function PortalHeaderShell({
  title,
  roleLabel,
  showAdminNav,
}: {
  title: string;
  roleLabel: string;
  showAdminNav: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] bg-[#050514]/80 px-4 backdrop-blur-xl md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            aria-expanded={open}
            aria-controls="portal-mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="min-w-0">
            <h1 className="truncate font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
              {title}
            </h1>
            <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">{roleLabel} workspace</p>
          </div>
        </div>
        <SignOutButton />
      </header>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <nav
            id="portal-mobile-nav"
            className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,100vw)] flex-col border-r border-white/[0.08] bg-[#050514]/98 p-4 shadow-2xl backdrop-blur-xl md:hidden"
          >
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 pb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/25">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="font-[family-name:var(--font-display)] text-sm font-semibold">Portal</span>
            </div>
            <div className="mt-4 flex flex-col gap-1">
              {learnerNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--muted-foreground)] transition hover:bg-white/[0.06] hover:text-[var(--foreground)]"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                  {item.label}
                </Link>
              ))}
              {showAdminNav ? (
                <div className="mt-4 border-t border-white/[0.06] pt-4">
                  <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                    Admin
                  </p>
                  {adminNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl border border-[var(--accent)]/15 bg-[var(--accent)]/5 px-3 py-2.5 text-sm text-[var(--foreground)] transition hover:bg-[var(--accent)]/10"
                    >
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </nav>
        </>
      ) : null}
    </>
  );
}
