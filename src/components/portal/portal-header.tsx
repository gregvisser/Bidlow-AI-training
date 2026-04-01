import { auth } from "@/auth";
import { PortalHeaderShell } from "@/components/portal/portal-header-shell";

export async function PortalHeader({ title }: { title: string }) {
  const session = await auth();
  const role = session?.user?.role;
  const roleLabel = role === "LEARNER" ? "Learner" : "Staff";
  const showAdminNav = role === "ADMIN" || role === "SUPER_ADMIN";

  return <PortalHeaderShell title={title} roleLabel={roleLabel} showAdminNav={showAdminNav} />;
}
