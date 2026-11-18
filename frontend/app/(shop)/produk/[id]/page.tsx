import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ProductPurchase } from "@/components/shop/product-purchase";
import { Gallery,DetailExtras } from "@/components/shop/detail-extras";
import { ProductGrid } from "@/components/shop/product-grid";
import { ShopRetry } from "@/components/shop/retry";
import { demoImages } from "@/lib/demo-images";
import { getCatalogProduct, catalogData } from "@/lib/server-catalog";
import { imageSource, productHref } from "@/lib/shop";
import { siteUrl } from "@/lib/site";
import type { Product } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

function getId(slug: string) {
  const id = /^([1-9]\d{0,15})(?:-[a-z0-9-]+)?$/.exec(slug)?.[1];
  if (!id) notFound();
  return id;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = getId((await params).id);
  const product = await getCatalogProduct(id);
  if (product === null) notFound();
  if (!product) return { title: "Detail produk" };

  const canonical = productHref(product);
  const description = product.description?.trim().slice(0, 160) || product.name + " tersedia di katalog Pasar Sembako.";
  const image = imageSource(product.image_url) || demoImages[product.name];
  return { title: product.name, description, alternates: { canonical },
    openGraph: { title: product.name, description, type: "website", url: canonical, images: image ? [image] : undefined } };
}

export default async function ProductPage({ params }: Props) {
  const slug = (await params).id;
  const id = getId(slug);
  const product = await getCatalogProduct(id);
  if (product === null) notFound();
  if (!product) return <div className="shop-container page"><ShopRetry /></div>;
  const canonical = productHref(product);
  if (canonical !== "/produk/" + slug) permanentRedirect(canonical);
  const related = await catalogData<Product[]>("/products?category_id=" + product.category_id + "&exclude=" + id + "&per_page=8");
  const image = imageSource(product.image_url) || demoImages[product.name];
  const offers = product.units.map((unit) => ({
    "@type": "Offer", name: unit.name, priceCurrency: "IDR", price: unit.price,
    availability: Number(unit.stock) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    url: new URL(canonical, siteUrl).href,
  }));
  const structured = { "@context": "https://schema.org", "@type": "Product", name: product.name, sku: String(product.id), category: product.category,
    image: image ? [new URL(image, siteUrl).href] : undefined, description: product.description ?? undefined, offers };
  return <div className="shop-container page shop-detail">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([structured,{"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[["Beranda","/"],["Belanja","/produk"],[product.name,canonical]].map(([name,url],i)=>({"@type":"ListItem",position:i+1,name,item:new URL(url,siteUrl).href}))}]).replace(/</g, "\\u003c") }} />
    <Link className="back-link" href="/produk"><ArrowLeft size={16} aria-hidden /> Kembali ke katalog</Link>
    <div className="shop-detail-grid">
      <Gallery product={product}/>
      <div className="shop-detail-copy">
        <Link className="shop-badge" href={"/produk?kategori=" + product.category_id}>{product.category}</Link>
        <h1>{product.name}</h1>

        <ProductPurchase product={product} /><DetailExtras product={product}/>
      </div>
    </div>
    {related && related.length > 0 && <section className="shop-section" aria-label="Produk Terkait">
      <div className="shop-section-heading"><h2>Produk Terkait</h2><Link className="text-link" href={"/produk?kategori=" + product.category_id}>Lihat Semua <ArrowRight size={15} aria-hidden /></Link></div>
      <ProductGrid products={related} horizontal />
    </section>}
  </div>;
}
