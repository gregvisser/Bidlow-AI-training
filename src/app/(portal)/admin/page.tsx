import Link from "next/link";
import { Activity, ClockAlert, LayoutGrid, LineChart, ScrollText, Shield } from "lucide-react";
import { PortalHeader } from "@/components/portal/portal-header";

const links = [
  {
    href: "/admin/courses",
    title: "Courses",
    desc: "Create, edit, and organize modules & lessons.",
    icon: LayoutGrid,
  },
  {
    href: "/admin/certificates",
    title: "Certificates",
    desc: "Audit issued certificates, learners, and course completion context.",
    icon: ScrollText,
  },
  {
    href: "/admin/reports",
    title: "Reporting",
    desc: "Learners, completions, and engagement from live data.",
    icon: LineChart,
  },
  {
    href: "/admin/stale-enrollments",
    title: "Stale seats",
    desc: "In-progress enrollments with no activity for 14+ days — export and follow up.",
    icon: ClockAlert,
  },
  {
    href: "/admin/ops",
    title: "Operations",
    desc: "Environment checks, webhooks, orders, and entitlement proof.",
    icon: Activity,
  },
];

export default function AdminHomePage() {
  return (
    <>
      <PortalHeader title="Administration" />
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-5 py-4 text-sm text-[var(--muted-foreground)]">
          <Shield className="h-5 w-5 text-[var(--accent)]" aria-hidden />
          Staff tools — changes apply immediately to the database.
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="glass-panel group block rounded-2xl p-8 transition hover:border-[var(--accent)]/35"
            >
              <l.icon className="h-8 w-8 text-[var(--accent)]" aria-hidden />
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-semibold group-hover:text-white">
                {l.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{l.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
