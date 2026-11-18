import { cache } from "react";
import { fetchServerApi } from "@/lib/server-api";
import type { Product } from "@/lib/types";

export async function catalogData<T>(path: string): Promise<T | null | undefined> {
  try {
    const sharedShelf = path === "/categories" || path === "/catalog/facets" || path === "/store" || path === "/products?stock=available&per_page=8" || path === "/products?stock=available&wholesale=1&per_page=8";
    const response = await fetchServerApi(path, { headers: { Accept: "application/json" }, ...(sharedShelf ? {cache:"force-cache" as const,next:{revalidate:30}} : {}) });
    if (response.status === 404) return null;
    if (!response.ok) return undefined;
    return (await response.json() as { data: T }).data;
  } catch {
    return undefined;
  }
}

export const getCatalogProduct = cache((id: string) => catalogData<Product>("/products/" + id));
