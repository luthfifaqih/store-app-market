"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesColumn, ClipboardList, CreditCard, History, Image, LayoutDashboard, LogOut, Package, Settings, ShoppingBasket, Tags, Truck } from "lucide-react";

export const adminMenu = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/produk", label: "Produk", icon: Package },
  { path: "/admin/kategori", label: "Kategori", icon: Tags },
  { path: "/admin/stok", label: "Stok", icon: History },
  { path: "/admin/pesanan", label: "Pesanan", icon: ClipboardList },
  { path: "/admin/pembayaran", label: "Pembayaran", icon: CreditCard },
  { path: "/admin/laporan", label: "Laporan", icon: ChartNoAxesColumn },
  { path: "/admin/zona", label: "Zona Pengiriman", icon: Truck },
  { path: "/admin/banner", label: "Banner", icon: Image },
];
export const adminSettings = { path: "/admin/pengaturan", label: "Pengaturan", icon: Settings };

export function Sidebar({ onNavigate, onLogout, busy }: { onNavigate?: () => void; onLogout: () => void; busy: boolean }) {
  const pathname = usePathname();
  const item = ({ path, label, icon: Icon }: typeof adminMenu[number]) => (
    <li key={path}><Link href={path} onClick={onNavigate}
      aria-current={pathname === path || (path !== "/admin" && pathname.startsWith(path + "/")) || (path === "/admin/produk" && pathname === "/admin/harga") ? "page" : undefined}>
      <span className="admin-nav-icon"><Icon size={16} aria-hidden /></span>{label}
    </Link></li>
  );
  return <>
    <Link href="/admin" onClick={onNavigate} className="admin-brand">
      <span className="admin-brand-icon"><ShoppingBasket size={22} aria-hidden /></span>Pasar Sembako
    </Link>
    <nav aria-label="Navigasi admin" className="admin-nav">
      <div><span>Menu</span><ul>{adminMenu.map(item)}</ul></div>
      <div><span>Lainnya</span><ul>{item(adminSettings)}
        <li><button type="button" disabled={busy} onClick={onLogout}><span className="admin-nav-icon"><LogOut size={16} aria-hidden /></span>{busy ? "Sedang keluar…" : "Keluar"}</button></li>
      </ul></div>
    </nav>
  </>;
}
