"use client";
import { useState } from "react";
import { Heart, MessageCircle, ZoomIn } from "lucide-react";
import { alert } from "@/lib/alert";
import { ProductImage } from "./product-image";
import { useSaved, toggleSaved } from "./saved";
import { productHref, imageSource } from "@/lib/shop";
import { demoImages } from "@/lib/demo-images";
import type { Product } from "@/lib/types";
export function Gallery({ product }: { product: Product }) {
  const src = imageSource(product.image_url) || demoImages[product.name];
  return (
    <div className="shop-gallery">
      <button
        className="shop-detail-image zoom-photo"
        aria-label={"Perbesar foto " + product.name}
        disabled={!src}
        onClick={() => {
          if (src) void alert.photo(product.name, src);
        }}
      >
        <ProductImage name={product.name} url={product.image_url} sizes="(min-width:900px) 45vw, 95vw" />
        {src && <ZoomIn size={20} />}
      </button>
    </div>
  );
}
export function DetailExtras({ product }: { product: Product }) {
  const [tab, setTab] = useState(0),
    saved = useSaved().includes(product.id);
  return (
    <div className="detail-extras">
      <div>
        <button className="shop-chip" aria-pressed={saved} onClick={() => toggleSaved(product.id)}>
          <Heart size={16} /> Wishlist
        </button>
        <button
          className="shop-chip"
          onClick={() =>
            window.open(
              "https://wa.me/?text=" +
                encodeURIComponent(product.name + " " + new URL(productHref(product), location.origin).href),
              "_blank",
              "noopener,noreferrer",
            )
          }
        >
          <MessageCircle size={16} /> Bagikan
        </button>
      </div>
      <div className="shop-chip-rail">
        {["Deskripsi", "Informasi tambahan"].map((label, i) => (
          <button key={label} className="shop-chip" aria-pressed={tab === i} onClick={() => setTab(i)}>
            {label}
          </button>
        ))}
      </div>
      <p>
        {tab === 0
          ? product.description || product.name
          : product.category + " · " + product.units.map((u) => u.name).join(", ")}
      </p>
    </div>
  );
}
