import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/admin/admin-frame";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { AdminBackendUnavailable, requireAdmin } from "@/lib/admin-session";

export const metadata: Metadata = { title: { default: "Panel admin", template: "%s | Panel admin" }, robots: { index: false, follow: false } };

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const staff = await requireAdmin().catch((error: unknown) => {
    if (!(error instanceof AdminBackendUnavailable)) throw error;
    return null;
  });

  if (!staff) return <div className="admin-loading"><section className="admin-panel"><AdminUnavailable /></section></div>;
  return <AppShell staff={staff}>{children}</AppShell>;
}

