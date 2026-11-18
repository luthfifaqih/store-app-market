"use client";
import { customerAccount } from "@/lib/customer-account";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { api, rupiah } from "@/lib/api";
import { alert } from "@/lib/alert";
import { productHref } from "@/lib/shop";
import type { Product, Category, Collection } from "@/lib/types";
import { ProductImage } from "./product-image";
export const categoriesQuery = {
  queryKey: ["categories"],
  queryFn: () => api<{ data: Category[] }>("/categories"),
};
export function StoreMenu() {
  const cats = useQuery(categoriesQuery);
  return (
    <nav className="store-menu">
      <Link href="/">Beranda</Link>
      <Link href="/produk">Semua produk</Link>
      {cats.data?.data.map((c) => (
        <Link key={c.id} href={"/produk?kategori=" + c.id}>
          {c.name}
        </Link>
      ))}
      <Link href="/#penawaran">Promo</Link>
      <Link href="/tentang">Tentang kami</Link>
      <Link href="/kontak">Kontak</Link>
      <Link href="/lacak">Lacak pesanan</Link>
      {customerAccount && <Link href="/akun">Akun pelanggan</Link>}
    </nav>
  );
}
function historyTerms(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem("shop-search") || "[]");
    return Array.isArray(list) ? list.filter((x) => typeof x === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}
export function SearchOverlay() {
  const [q, setQ] = useState(""),
    [term, setTerm] = useState(""),
    [active, setActive] = useState(-1);
  const [history] = useState(historyTerms);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  useEffect(() => {
    input.current?.focus();
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setTerm(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);
  const cats = useQuery(categoriesQuery);
  const products = useQuery({
    queryKey: ["suggest", term],
    enabled: !!term,
    queryFn: () => api<Collection<Product>>("/products?per_page=5&q=" + encodeURIComponent(term)),
  });
  const options = term
    ? [
        ...(cats.data?.data ?? [])
          .filter((c) => c.name.toLowerCase().includes(term.toLowerCase()))
          .map((c) => ({ title: c.name, href: "/produk?kategori=" + c.id, product: undefined })),
        ...(products.data?.data ?? []).map((p) => ({ title: p.name, href: productHref(p), product: p })),
      ]
    : history.map((h) => ({ title: h, href: "/produk?q=" + encodeURIComponent(h), product: undefined }));
  function visit(href: string) {
    if (q.trim())
      try {
        localStorage.setItem(
          "shop-search",
          JSON.stringify([q.trim(), ...history.filter((h) => h !== q.trim())].slice(0, 5)),
        );
      } catch {}
    alert.close();
    router.push(href);
  }
  return (
    <>
      <form
        className="overlay-search"
        onSubmit={(e) => {
          e.preventDefault();
          visit(options[active]?.href ?? "/produk?q=" + encodeURIComponent(q.trim()));
        }}
      >
        <Search aria-hidden />
        <input
          ref={input}
          role="combobox"
          aria-label="Nama produk atau kategori"
          aria-controls="suggestions"
          aria-expanded={!!options.length}
          aria-activedescendant={active >= 0 ? "suggest-" + active : undefined}
          maxLength={100}
          placeholder="Cari beras, gula, minyak…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) =>
                Math.max(-1, Math.min(options.length - 1, a + (e.key === "ArrowDown" ? 1 : -1))),
              );
            }
          }}
        />
        <button>Cari</button>
      </form>
      {!term && history.length > 0 && <p>Pencarian terakhir</p>}
      <div role="listbox" id="suggestions">
        {options.map((o, i) => (
          <button
            role="option"
            aria-selected={active === i}
            id={"suggest-" + i}
            className="suggest-row"
            key={o.href}
            onClick={() => visit(o.href)}
          >
            {o.product && (
              <span className="mini-photo">
                <ProductImage name={o.title} url={o.product.image_url} sizes="48px" />
              </span>
            )}
            {o.title}
            {o.product?.units[0] && <small>{rupiah(o.product.units[0].price)}</small>}
          </button>
        ))}
      </div>
      {term && !products.isFetching && !options.length && (
        <p>
          {products.isError ? "Saran belum tersedia. Gunakan tombol Cari." : "Tidak ada saran yang cocok."}
        </p>
      )}
    </>
  );
}
