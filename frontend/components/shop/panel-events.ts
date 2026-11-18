import type { Product, Category } from "@/lib/types";
export type Filters = {
  q: string;
  kategori: string;
  sort: string;
  stok: string;
  grosir: string;
  view: string;
  min_price: string;
  max_price: string;
  unit: string;
};
export type Facets = { units: string[]; categories: Record<string, number>; max_price: number };
export type ShopPanel =
  | { type: "search" | "menu" | "cart" }
  | { type: "quick"; product: Product }
  | { type: "filter"; filters: Filters; categories: Category[]; facets?: Facets };
export function openPanel(panel: ShopPanel) {
  window.dispatchEvent(new CustomEvent("shop-panel", { detail: panel }));
}
