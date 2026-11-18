import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Grid2X2, Grid3X3, List } from "lucide-react";
import { catalogData } from "@/lib/server-catalog";
import type { Category, Collection, Product } from "@/lib/types";
import { sortOptions } from "@/lib/shop";
import { fetchServerApi } from "@/lib/server-api";
import { CatalogSearch, FilterFields, FilterSheet } from "@/components/shop/filters";
import {SortSelect} from "@/components/shop/catalog-tools";
import { ProductGrid } from "@/components/shop/product-grid";
import { EmptyState } from "@/components/ui-shared/primitives";
import { ShopRetry } from "@/components/shop/retry";

export const metadata: Metadata = { title: "Katalog sembako", description: "Cari kebutuhan dapur, bandingkan satuan, dan cek harga grosir.", alternates: { canonical: "/produk" } };
type Params = Record<string, string | string[] | undefined>;

async function products(filters: URLSearchParams): Promise<Collection<Product> | undefined> {
  try {
    const response = await fetchServerApi("/products?" + filters, { headers: { Accept: "application/json" } });
    if (response.ok) return await response.json() as Collection<Product>;
  } catch { /* Tampilkan percobaan ulang jika API tidak tersedia. */ }
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const read = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const sort = read("sort");
  const stock = read("stok");
  const category = read("kategori");
  const view = ["3","list"].includes(read("view")) ? read("view") : "4";
  const money=(key:string)=>/^\\d{1,9}$/.test(read(key)) && Number(read(key))<=100000000 ? read(key) : "";
  const filters = { view, unit:read("unit").slice(0,80), min_price:money("min_price"), max_price:money("max_price"), q: read("q").trim().slice(0, 100), kategori: /^[1-9]\d{0,14}$/.test(category) ? category : "",
    sort: sortOptions.some((item) => item.value === sort) ? sort : "", stok: ["available", "sold-out"].includes(stock) ? stock : "", grosir: read("grosir") === "1" ? "1" : "" };
  const page = /^[1-9]\d{0,5}$/.test(read("halaman")) ? Number(read("halaman")) : 1;
  const backend = new URLSearchParams({ page: String(page), per_page: "12" });
  for (const [key, value] of Object.entries({ q: filters.q, unit:filters.unit,min_price:filters.min_price,max_price:filters.max_price, category_id: filters.kategori, sort: filters.sort, stock: filters.stok, wholesale: filters.grosir })) {
    if (value) backend.set(key, value);
  }
  const [list, categories,facets] = await Promise.all([products(backend), catalogData<Category[]>("/categories"),catalogData<{units:string[];categories:Record<string,number>;max_price:number}>("/catalog/facets")]);
  const key = JSON.stringify(filters);
  const href = (updates: Record<string, string>) => {
    const query = new URLSearchParams(Object.entries({ ...filters, ...updates }).filter(([, value]) => value));
    return "/produk" + (query.size ? "?" + query : "");
  };

  return <div className="shop-container page">
    <nav className="store-crumb"><Link href="/">Beranda</Link> / Belanja</nav><header className="shop-page-heading catalog-mast"><p className="fresh-eyebrow">~ Rak belanja ~</p><h1>Katalog sembako</h1><p>Pilih kebutuhan dapur, dari eceran sampai grosir.</p></header>
    <div className="shop-catalog-toolbar"><CatalogSearch key={key} filters={filters} /><FilterSheet key={"sheet" + key} filters={filters} facets={facets??undefined} categories={categories ?? []} /></div>
    <nav className="shop-chip-rail" aria-label="Kategori katalog">
      {[{ id: "", name: "Semua" }, ...(categories ?? [])].map((item) => <Link key={item.id} className="shop-chip" aria-current={filters.kategori === String(item.id) ? "page" : undefined}
        href={href({ kategori: String(item.id) })}>{item.name}</Link>)}
    </nav>
    <div className="shop-catalog-layout">
      <aside className="shop-catalog-aside shop-card"><h2>Filter</h2><FilterFields key={key} filters={filters} facets={facets??undefined} categories={categories ?? []} /><Link href="/produk?grosir=1" className="grosir-aside"><strong>Harga grosir hemat</strong><span>Jelajahi kemasan grosir →</span></Link></aside>
      <section className="shop-catalog-results" aria-label="Hasil katalog">
        {!categories && <ShopRetry />}
        {!list ? <ShopRetry /> : <>
          <div className="result-bar"><p className="shop-count-text">Menampilkan {list.data.length ? (page-1)*12+1 : 0}–{list.data.length ? (page-1)*12+list.data.length : 0} dari {list.meta.total} produk{filters.q ? " untuk “" + filters.q + "”" : ""}</p><SortSelect filters={filters}/><div className="view-toggle">{[{id:"3",Icon:Grid3X3,label:"Grid tiga kolom"},{id:"4",Icon:Grid2X2,label:"Grid empat kolom"},{id:"list",Icon:List,label:"Tampilan daftar"}].map(({id,Icon,label})=><Link key={id} aria-label={label} aria-current={view===id?"true":undefined} href={href({view:id,halaman:String(page)})}><Icon size={18}/></Link>)}</div></div>
          <div data-view={view}>{list.data.length ? <ProductGrid products={list.data} wholesale={filters.grosir === "1"} /> : <EmptyState>Produk tidak ditemukan <Link href="/produk">Reset filter</Link></EmptyState>}</div>
          {list.meta.last_page > 1 && <nav className="shop-pager" aria-label="Halaman katalog">
            {page > 1 && <Link className="shop-chip" href={href({ halaman: String(page - 1) })}><ArrowLeft size={15} aria-hidden /> Sebelumnya</Link>}
            {Array.from({length:Math.min(5,list.meta.last_page)},(_,i)=>Math.min(Math.max(1,page-2),Math.max(1,list.meta.last_page-4))+i).map(n=><Link className="shop-chip" key={n} aria-label={"Halaman "+n} aria-current={page===n?"page":undefined} href={href({halaman:String(n)})}>{n}</Link>)}
            {page < list.meta.last_page && <Link className="shop-chip" href={href({ halaman: String(page + 1) })}>Berikutnya <ArrowRight size={15} aria-hidden /></Link>}
          </nav>}
        </>}
      </section>
    </div>
  </div>;
}
