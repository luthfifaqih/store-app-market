import type { Product } from "@/lib/types";
import { SkeletonCard } from "@/components/ui-shared/primitives";
import { ProductCard } from "./product-card";

export function ProductGrid({ products, horizontal = false, wholesale = false }: { products: Product[]; horizontal?: boolean; wholesale?: boolean }) {
  return <div className={horizontal ? "shop-product-rail" : "shop-product-grid"}>
    {products.map((product) => <ProductCard key={product.id} product={product} wholesale={wholesale} />)}
  </div>;
}

export function ProductGridSkeleton() {
  return <div className="shop-product-grid" aria-label="Memuat produk">{Array.from({ length: 4 }, (_, index) => <SkeletonCard key={index} />)}</div>;
}
