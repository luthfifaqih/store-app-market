"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Dashboard, Staff } from "@/lib/admin";
import { adminMenu, adminSettings } from "./sidebar";

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0] ?? "").join("").toUpperCase();
}

export function Topbar({ staff, menuTrigger }: { staff: Staff; menuTrigger: ReactNode }) {
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const query = useQuery({
    queryKey: ["admin", "dashboard"], queryFn: () => api<{ data: Dashboard }>("/admin/dashboard", "GET", undefined, true),
    staleTime: 30_000, refetchInterval: 60_000,
  });
  const notifications = query.data?.data;
  const hasAlerts = Boolean(notifications?.pending_count || notifications?.low_stock_count);
  const results = [...adminMenu, adminSettings].filter(({ label }) => label.toLowerCase().includes(search.trim().toLowerCase()));
  return <header className="admin-topbar">
    <div className="admin-greeting">{menuTrigger}<p>Halo, {staff.name}!</p></div>
    <div className="admin-top-search" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setShowResults(false);
    }} onKeyDown={(event) => {
      if (event.key === "Escape") setShowResults(false);
    }}>
      <label className="admin-search"><Search size={18} aria-hidden />
        <input type="search" aria-label="Cari menu admin" placeholder="Cari menu…" value={search}
          onFocus={() => setShowResults(true)} onChange={(event) => { setSearch(event.target.value); setShowResults(true); }} />
      </label>
      {showResults && search.trim() && <div className="admin-popover" aria-label="Hasil pencarian menu">
        {results.length ? results.map(({ path, label }) => <Link key={path} href={path} onClick={() => { setSearch(""); setShowResults(false); }}>{label}</Link>) : <p>Menu tidak ditemukan.</p>}
      </div>}
    </div>
    <div className="admin-top-actions">
      <details className="admin-notifications">
        <summary className="admin-icon-button" aria-label={hasAlerts ? "Notifikasi baru" : "Notifikasi"}><Bell size={20} aria-hidden />{hasAlerts && <span className="admin-notification-dot" />}</summary>
        <div className="admin-popover">
          <strong>Notifikasi</strong>
          {query.isPending && <p>Memuat notifikasi…</p>}
          {query.isError && <button type="button" onClick={() => query.refetch()}>Muat ulang notifikasi</button>}
          {notifications && !hasAlerts && <p>Belum ada notifikasi baru.</p>}
          {!!notifications?.pending_count && <Link href="/admin/pesanan?status=pending" onClick={closeNotifications}>{notifications.pending_count} pesanan baru</Link>}
          {!!notifications?.low_stock_count && <Link href="/admin/stok?tab=menipis" onClick={closeNotifications}>{notifications.low_stock_count} satuan menipis</Link>}
        </div>
      </details>
      <span className="admin-avatar" aria-label={staff.name} title={staff.name}>{initials(staff.name)}</span>
    </div>
  </header>;
}

function closeNotifications(event: React.MouseEvent<HTMLAnchorElement>) {
  event.currentTarget.closest("details")?.removeAttribute("open");
}
