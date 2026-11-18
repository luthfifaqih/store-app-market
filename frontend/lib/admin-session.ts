import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Staff } from "@/lib/admin";
import { fetchServerApi } from "@/lib/server-api";

export class AdminBackendUnavailable extends Error {}

export async function getAdminData<T>(path: string): Promise<T> {
  const cookie = (await headers()).get("cookie");
  if (!cookie) redirect("/admin/login");

  const response = await fetchServerApi("/admin" + path, {
    headers: { Accept: "application/json", Origin: process.env.ADMIN_FRONTEND_ORIGIN || "http://localhost:3000", Cookie: cookie },
  }, true).catch(() => { throw new AdminBackendUnavailable(); });
  if (response.status === 401 || response.status === 403) redirect("/admin/login");
  if (response.status === 404 && path !== "/me") notFound();
  if (!response.ok) throw new AdminBackendUnavailable();

  try {
    const result = await response.json() as { data: T };
    if (result?.data == null) throw new AdminBackendUnavailable();
    return result.data;
  } catch {
    throw new AdminBackendUnavailable();
  }
}

export function requireAdmin(): Promise<Staff> {
  return getAdminData<Staff>("/me");
}
