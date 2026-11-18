import type { Product, Unit } from "@/lib/types";

export function productHref(product: Pick<Product, "id" | "name">) {
  const name = product.name.normalize("NFD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return "/produk/" + product.id + (name ? "-" + name : "");
}

export function priceFor(unit: Unit, quantity: number) {
  return unit.tiers.reduce((best, tier) => Number(tier.min_quantity) <= quantity && Number(tier.min_quantity) >= best.minimum
    ? { minimum: Number(tier.min_quantity), price: tier.price }
    : best, { minimum: 0, price: unit.price });
}

export const quantityText = (quantity: number | string) => Number(quantity).toLocaleString("id-ID", { maximumFractionDigits: 3 });

export function amountString(quantity: number) {
  return String(Math.round(quantity * 1000) / 1000);
}

export function imageSource(url?: string | null) {
  if (!url) return undefined;
  if (/^\/(?![\/\\])/.test(url)) return url;
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

export const sortOptions = [
  { value: "", label: "Rekomendasi" }, { value: "bestsellers", label: "Terlaris" }, { value: "newest", label: "Terbaru" },
  { value: "price_asc", label: "Harga terendah" }, { value: "price_desc", label: "Harga tertinggi" },
  { value: "name_asc", label: "Nama A–Z" },
] as const;
