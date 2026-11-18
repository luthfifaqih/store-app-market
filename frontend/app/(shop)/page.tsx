import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Banknote, PackageCheck, ShoppingBasket } from "lucide-react";
import { catalogData } from "@/lib/server-catalog";
import { productHref } from "@/lib/shop";
import type { Product, Category } from "@/lib/types";
import { CountdownBanner } from "@/components/shop/countdown";
import { HeroCarousel } from "@/components/shop/hero-carousel";
import dynamic from "next/dynamic";
import {BuyNow} from "@/components/shop/buy-now";
import {Reveal} from "@/components/shop/reveal";
const ProductCarousel=dynamic(()=>import("@/components/shop/product-carousel").then(m=>m.ProductCarousel));
import { CategoryTile } from "@/components/shop/category-tile";
import { SectionTitle } from "@/components/shop/sections";
import { ProductImage } from "@/components/shop/product-image";
import { ShopRetry } from "@/components/shop/retry";
export const metadata = { alternates: { canonical: "/" } };
export default function Home() {
  return (
    <div className="shop-container shop-home">
      <HeroCarousel />
      <Suspense
        fallback={
          <section className="shop-section" aria-label="Memuat katalog">
            <SectionTitle eyebrow="Jelajahi rak toko" title="Belanja per" accent="kategori" />
            <div className="shop-category-placeholder" />
          </section>
        }
      >
        <HomeContent />
      </Suspense>
      <section className="shop-section">
        <SectionTitle eyebrow="Belanja praktis" title="Cara" accent="pesan" />
        <ol className="shop-how">
          {[
            { title: "Pilih kebutuhan", text: "Tentukan produk, satuan, dan jumlah.", Icon: ShoppingBasket },
            { title: "Buat pesanan", text: "Isi alamat atau pilih ambil di toko.", Icon: Banknote },
            { title: "Terima belanja", text: "Pantau pesanan dengan kode dan nomor HP.", Icon: PackageCheck },
          ].map(({ title, text, Icon }, i) => (
            <li key={title} data-color={i}>
              <span>
                <Icon />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
async function HomeContent() {
  const [categories, facets, products, wholesale, store] = await Promise.all([
    catalogData<Category[]>("/categories"),
    catalogData<{ categories: Record<string, number> }>("/catalog/facets"),
    catalogData<Product[]>("/products?stock=available&per_page=8"),
    catalogData<Product[]>("/products?stock=available&wholesale=1&per_page=8"),
    catalogData<{ promo_ends_at?: string }>("/store"),
  ]);
  const featured = products?.[0];
  return (
    <>
      <section className="shop-section">
        <SectionTitle eyebrow="Jelajahi rak toko" title="Belanja per" accent="kategori">
          <Link href="/produk">
            Semua kategori <ArrowRight size={16} />
          </Link>
        </SectionTitle>
        {categories ? (
          <div className="shop-category-rail">
            {categories.map((c, i) => (
              <CategoryTile
                key={c.id}
                category={c}
                index={i}
                count={facets ? (facets.categories[c.id] ?? 0) : undefined}
              />
            ))}
          </div>
        ) : (
          <ShopRetry />
        )}
      </section>
      <section id="penawaran" className="shop-section">
        <SectionTitle eyebrow="Pilihan pekan ini" title="Penawaran" accent="mingguan">
          <Link href="/produk">
            Lihat semua produk <ArrowRight size={16} />
          </Link>
        </SectionTitle>
        {products ? <ProductCarousel products={products} categories={categories ?? []} /> : <ShopRetry />}
      </section>
      {featured && (
        <Reveal><section className="featured-product">
          <div className="featured-photo">
            <ProductImage
              name={featured.name}
              url={featured.image_url}
              sizes="(max-width:650px) 80vw, 380px"
            />
          </div>
          <div>
            <p className="fresh-eyebrow">~ Sorotan dapur ~</p>
            <h2>{featured.name}</h2>
            <p>{featured.description || featured.category}</p>
            <p>{featured.units.map((u) => u.name).join(" · ")}</p>
            <Link className="store-cta outline" href={productHref(featured)}>
              Lihat detail
            </Link>{" "}
            <BuyNow product={featured}/>
          </div>
        </section></Reveal>
      )}
      {store?.promo_ends_at && <CountdownBanner ends={store.promo_ends_at} />}
      <section className="shop-section">
        <SectionTitle eyebrow="Belanja dalam jumlah besar" title="Harga grosir" accent="hemat">
          <Link href="/produk?grosir=1">
            Lihat semua <ArrowRight size={16} />
          </Link>
        </SectionTitle>
        {wholesale ? <ProductCarousel products={wholesale} wholesale /> : <ShopRetry />}
      </section>
    </>
  );
}
