"use client";
import Link from "next/link";
import { useState } from "react";
import { zonesQuery } from "./cart";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/components/providers";
import { api, rupiah } from "@/lib/api";
import { alert } from "@/lib/alert";
import { productHref, quantityText } from "@/lib/shop";
import type { Product, Quote } from "@/lib/types";
import { ProductPurchase } from "./product-purchase";
import { ProductImage } from "./product-image";
import { Trash2 } from "lucide-react";
export function QuickView({ product }: { product: Product }) {
  return (
    <>
      <div className="quick-image">
        <ProductImage name={product.name} url={product.image_url} sizes="200px" />
      </div>
      <h2>{product.name}</h2>
      <ProductPurchase product={product} />
      <Link href={productHref(product)}>Lihat detail lengkap →</Link>
    </>
  );
}
export function CartDrawer() {
  const cart = useCart();
  const [zoneId, setZone] = useState("");
  const zones = useQuery({ ...zonesQuery, enabled: !!cart.items.length });
  const zone = zones.data?.data.find((z) => String(z.id) === zoneId);
  const quote = useQuery({
    queryKey: [
      "quote",
      cart.token,
      cart.items.map((i) => i.product_unit_id + ":" + i.quantity).join(","),
      "cart",
    ],
    queryFn: () =>
      api<{ data: Quote }>(
        "/orders/quote",
        "POST",
        { fulfillment: "pickup" },
        false,
        cart.token ?? undefined,
      ),
    enabled: !!cart.token && !!cart.items.length,
  });
  return (
    <>
      {cart.items.map((i) => (
        <div className="mini-cart-row" key={i.product_unit_id}>
          <span className="mini-photo">
            <ProductImage name={i.product_name} url={i.image_url} sizes="54px" />
          </span>
          <div>
            <strong>{i.product_name}</strong>
            <p>
              {quantityText(i.quantity)} {i.unit_name} ×{" "}
              {rupiah(
                quote.data?.data.items.find((line) => line.product_unit_id === i.product_unit_id)
                  ?.unit_price ??
                  i.unit_price ??
                  0,
              )}
            </p>
          </div>
          <button
            aria-label={"Hapus " + i.product_name}
            disabled={cart.pending}
            onClick={async () => {
              if (await alert.confirm({ title: "Hapus dari keranjang?", text: i.product_name, danger: true }))
                await cart.remove(i.product_unit_id);
            }}
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      {cart.items.length ? (
        <>
          <p className="drawer-total">
            Subtotal <strong>{quote.data ? rupiah(quote.data.data.subtotal) : "—"}</strong>
          </p>
          {zones.data?.data.length ? (
            <label className="field">
              Minimum belanja per zona
              <select className="control" value={zoneId} onChange={(e) => setZone(e.target.value)}>
                <option value="">Pilih zona pengiriman</option>
                {zones.data.data.map((z) => (
                  <option value={z.id} key={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {zone && zone.minimum > 0 && quote.data && (
            <div className="shop-progress">
              <progress
                aria-label="Minimum belanja zona"
                max={zone.minimum}
                value={Math.min(zone.minimum, quote.data.data.subtotal)}
              />
              <small>
                {quote.data.data.subtotal < zone.minimum
                  ? "Tambahkan " + rupiah(zone.minimum - quote.data.data.subtotal) + " untuk minimum zona."
                  : "Minimum zona terpenuhi."}
              </small>
            </div>
          )}
          <Link className="store-cta" href={"/checkout" + (zone ? "?zona=" + zone.id : "")}>
            Checkout
          </Link>
        </>
      ) : (
        <p>Keranjang masih kosong.</p>
      )}
      <Link className="store-cta outline" href="/keranjang">
        Lihat keranjang
      </Link>
    </>
  );
}
