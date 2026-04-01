import Link from "next/link";
import { auth } from "@/auth";
import { Sparkles } from "lucide-react";
import { adminNavItems, learnerNavItems } from "@/lib/portal-nav";

export async function PortalSidebar() {
  const session = await auth();
  const role = session?.user?.role;
  const isStaff = role === "ADMIN" || role === "SUPER_ADMIN";

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.06] bg-[#050514]/90 backdrop-blur-xl md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-white/[0.06] px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/25">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight">
          Portal
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {learnerNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--muted-foreground)] transition hover:bg-white/[0.06] hover:text-[var(--foreground)]"
          >
            <item.icon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
            {item.label}
          </Link>
        ))}
        {isStaff && (
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Admin
            </p>
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl border border-[var(--accent)]/15 bg-[var(--accent)]/5 px-3 py-2.5 text-sm text-[var(--foreground)] transition hover:bg-[var(--accent)]/10"
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
      <div className="border-t border-white/[0.06] p-4 text-xs text-[var(--muted-foreground)]">
        <p className="truncate font-medium text-[var(--foreground)]">{session?.user?.name}</p>
        <p className="truncate">{session?.user?.email}</p>
      </div>
    </aside>
  );
}
