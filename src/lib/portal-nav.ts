import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Award,
  BookOpen,
  ClockAlert,
  CreditCard,
  GitBranch,
  LayoutDashboard,
  Layers,
  LineChart,
  ScrollText,
  Settings,
  Shield,
} from "lucide-react";

export type PortalNavItem = { href: string; label: string; icon: LucideIcon };

export const learnerNavItems: PortalNavItem[] = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/courses", label: "Courses", icon: BookOpen },
  { href: "/portal/tracks", label: "Tracks", icon: Layers },
  { href: "/portal/paths/ai-agent-mastery", label: "Learning path", icon: GitBranch },
  { href: "/portal/certificates", label: "Certificates", icon: Award },
  { href: "/portal/reports", label: "Reports", icon: LineChart },
  { href: "/portal/billing", label: "Billing", icon: CreditCard },
  { href: "/portal/settings", label: "Settings", icon: Settings },
];

export const adminNavItems: PortalNavItem[] = [
  { href: "/admin", label: "Overview", icon: Shield },
  { href: "/admin/paths", label: "Tracks", icon: Layers },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/certificates", label: "Certificates", icon: ScrollText },
  { href: "/admin/reports", label: "Reports", icon: LineChart },
  { href: "/admin/stale-enrollments", label: "Stale seats", icon: ClockAlert },
  { href: "/admin/ops", label: "Operations", icon: Activity },
];
