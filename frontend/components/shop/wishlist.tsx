"use client";
import { useQueries } from "@tanstack/react-query";
import Link from "next/link";
import { useSaved, toggleSaved } from "./saved";
import { api, ApiError } from "@/lib/api";
import type { Product } from "@/lib/types";
import { ProductCard } from "./product-card";
import { SkeletonCard } from "@/components/ui-shared/primitives";
import { Failure } from "@/components/feedback";
export function Wishlist() {
  const ids = useSaved();
  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["saved-product", id],
      queryFn: () => api<{ data: Product }>("/products/" + id),
    })),
  });
  return ids.length ? (
    <div className="shop-product-grid">
      {queries.map((q, i) =>
        q.data ? (
          <ProductCard key={ids[i]} product={q.data.data} moveSaved />
        ) : q.isPending ? (
          <SkeletonCard key={ids[i]} />
        ) : q.error instanceof ApiError && q.error.status === 404 ? (
          <div className="panel" key={ids[i]}>
            Produk sudah tidak tersedia.{" "}
            <button onClick={() => toggleSaved(ids[i])}>Hapus dari wishlist</button>
          </div>
        ) : (
          <Failure key={ids[i]} error={q.error} retry={() => q.refetch()} />
        ),
      )}
    </div>
  ) : (
    <div className="panel">
      <p>Belum ada produk tersimpan. Ketuk ikon hati pada produk yang ingin Anda simpan.</p>
      <Link className="store-cta" href="/produk">
        Jelajahi produk
      </Link>
    </div>
  );
}
