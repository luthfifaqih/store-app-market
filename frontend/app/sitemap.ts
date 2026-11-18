import type { MetadataRoute } from "next";
import { catalogData } from "@/lib/server-catalog";
import { productHref } from "@/lib/shop";
import { siteUrl } from "@/lib/site";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await catalogData<Pick<Product, "id" | "name">[]>("/catalog/sitemap?names=1");
  return ["/", "/produk", "/tentang", "/kontak", "/lokasi", "/faq", "/syarat", ...(products ?? []).map(productHref)]
    .map((path) => ({ url: new URL(path, siteUrl).href }));
}
