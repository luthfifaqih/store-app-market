"use client";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "./product-card";
import { api } from "@/lib/api";
import type { Product, Category, Collection } from "@/lib/types";
import { Failure } from "@/components/feedback";
export function ProductCarousel({
  products,
  wholesale = false,
  categories = [],
}: {
  products: Product[];
  wholesale?: boolean;
  categories?: Category[];
}) {
  const [category, setCategory] = useState(0);
  const [ref, carousel] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });
  const query = useQuery({
    queryKey: ["weekly", category],
    enabled: !!category,
    queryFn: () => api<Collection<Product>>("/products?stock=available&per_page=8&category_id=" + category),
  });
  const rows = category ? (query.data?.data ?? []) : products;
  return (
    <>
      {categories.length > 0 && (
        <div className="shop-chip-rail">
          {[{ id: 0, name: "Semua" }, ...categories].map((c) => (
            <button
              className="shop-chip"
              aria-pressed={c.id === category}
              key={c.id}
              onClick={() => {
                setCategory(c.id);
                carousel?.scrollTo(0);
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      {category > 0 && query.isPending ? (
        <p role="status">Memuat produk…</p>
      ) : query.isError ? (
        <Failure error={query.error} retry={() => query.refetch()} />
      ) : !rows.length ? (
        <p>Belum ada produk tersedia.</p>
      ) : (
        <div className="fresh-rail">
          <div className="embla-window" ref={ref}>
            <div className="embla-track">
              {rows.map((p) => (
                <ProductCard key={p.id} product={p} wholesale={wholesale} />
              ))}
            </div>
          </div>
          {rows.length > 1 && (
            <div className="rail-arrows">
              <button aria-label="Produk sebelumnya" onClick={() => carousel?.scrollPrev()}>
                <ChevronLeft />
              </button>
              <button aria-label="Produk berikutnya" onClick={() => carousel?.scrollNext()}>
                <ChevronRight />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
