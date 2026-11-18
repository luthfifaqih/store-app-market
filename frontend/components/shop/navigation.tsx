"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { customerAccount } from "@/lib/customer-account";
import {
  UserRound,
  Heart,
  Menu,
  ChevronDown,
  MapPin,
  Sprout,
  Truck,
  House,
  LayoutGrid,
  PackageSearch,
  Search,
  ShoppingBag,
  ShoppingBasket,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { openPanel } from "./panel-events";
import { useSaved } from "./saved";
import { StoreMenu } from "./store-menu";
import type { Quote } from "@/lib/types";
import { api, rupiah } from "@/lib/api";
import { shopQuery } from "./support";
import { useCart } from "@/components/providers";
import type { ComponentProps } from "react";

export function SearchPill(props: ComponentProps<"input">) {
  return (
    <label className="shop-search">
      <Search size={18} aria-hidden />
      <input type="search" maxLength={100} {...props} />
    </label>
  );
}

const links = [
  { path: "/", title: "Beranda", icon: House },
  { path: "/produk", title: "Belanja", icon: LayoutGrid },
  { path: "/keranjang", title: "Keranjang", icon: ShoppingBag },
  { path: "/lacak", title: "Lacak", icon: PackageSearch },
];

function isActive(path: string, pathname: string) {
  if (path === "/produk") return pathname.startsWith("/produk") || pathname === "/katalog";
  if (path === "/keranjang") return pathname === path || pathname === "/checkout";
  return pathname === path;
}

export function Header() {
  const { items, token } = useCart();
  const quote = useQuery({
    queryKey: ["quote", token, items.map((i) => i.product_unit_id + ":" + i.quantity).join(","), "cart"],
    queryFn: () =>
      api<{ data: Quote }>("/orders/quote", "POST", { fulfillment: "pickup" }, false, token ?? undefined),
    enabled: !!token && !!items.length,
  });
  const profile = useQuery(shopQuery).data?.data;
  const saved = useSaved();
  return (
    <>
      <div className="fresh-top">
        <div className="shop-container">
          <span>
            <Truck size={15} /> {profile?.info_bar || profile?.hours || "Pengantaran sesuai zona toko"}
          </span>
          <nav>
            <Link href="/lokasi">
              <MapPin size={13} /> Lokasi toko
            </Link>
            <Link href="/lacak">Lacak pesanan</Link>
            <Link href="/faq">FAQ</Link>
          </nav>
        </div>
      </div>
      <header className="shop-header">
        <div className="shop-container shop-header-inner">
          <button
            className="shop-icon fresh-mobile"
            aria-label="Buka menu toko"
            onClick={() => openPanel({ type: "menu" })}
          >
            <Menu size={20} />
          </button>
          <Link className="shop-brand" href="/">
            <span>
              <Sprout size={25} />
            </span>
            {profile?.name || "Pasar Sembako"}
          </Link>
          <nav className="shop-desktop-nav" aria-label="Menu toko">
            <Link href="/">Beranda</Link>
            <details
              className="mega-menu"
              onClick={(e) => {
                if (e.target instanceof Element && e.target.closest("a")) e.currentTarget.open = false;
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") e.currentTarget.open = false;
              }}
            >
              <summary>
                Belanja <ChevronDown size={15} />
              </summary>
              <StoreMenu />
            </details>
            <Link href="/#penawaran">Promo</Link>
            <Link href="/tentang">Tentang Kami</Link>
            <Link href="/kontak">Kontak</Link>
          </nav>
          <div className="fresh-tools">
            {customerAccount && (
              <Link href="/akun" className="shop-icon" aria-label="Akun pelanggan">
                <UserRound size={19} />
              </Link>
            )}
            <button
              className="shop-icon"
              aria-label="Cari produk"
              onClick={() => openPanel({ type: "search" })}
            >
              <Search size={19} />
            </button>
            <Link className="shop-icon" href="/wishlist" aria-label={"Wishlist, " + saved.length + " produk"}>
              <Heart size={19} />
              {saved.length > 0 && <b className="shop-count">{saved.length}</b>}
            </Link>
            <button
              className="shop-icon"
              aria-label={"Buka keranjang, " + items.length + " barang"}
              onClick={() => openPanel({ type: "cart" })}
            >
              <ShoppingBasket size={20} />
              {items.length > 0 && <b className="shop-count" key={items.length}>{items.length}</b>}
            </button>
            <span className="header-total">
              Keranjang
              <strong>
                {!items.length ? rupiah(0) : quote.data ? rupiah(quote.data.data.subtotal) : "—"}
              </strong>
            </span>
          </div>
        </div>
      </header>
    </>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const cart = useCart();
  return (
    <nav className="shop-bottom-nav" aria-label="Navigasi toko mobile">
      {links.map(({ path, title, icon: Icon }) => (
        <Link key={path} href={path} aria-current={isActive(path, pathname) ? "page" : undefined}>
          <span>
            <Icon size={20} aria-hidden />
            {path === "/keranjang" && cart.items.length > 0 && (
              <b className="shop-count">{cart.items.length}</b>
            )}
          </span>
          {title}
        </Link>
      ))}
    </nav>
  );
}
