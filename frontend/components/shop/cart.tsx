"use client";

import { alert } from "@/lib/alert";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/components/providers";
import { CartFeedback } from "@/components/cart-feedback";
import { Button } from "@/components/ui/button";
import { EmptyState, PillSelect, SkeletonCard } from "@/components/ui-shared/primitives";
import { Failure } from "@/components/feedback";
import { api, rupiah } from "@/lib/api";
import { amountString, productHref, quantityText } from "@/lib/shop";
import type { CartItem, Quote, Zone } from "@/lib/types";
import { OrderSummary } from "./order-summary";
import { PriceText } from "./price-text";
import { ProductImage } from "./product-image";
import { QtyStepper } from "./qty-stepper";

export const zonesQuery = { queryKey: ["zones"], queryFn: () => api<{ data: Zone[] }>("/shipping-zones") };

export function EmptyCart() {
  return <div className="panel shop-empty-cart"><EmptyState>Keranjang masih kosong.</EmptyState>
    <Button asChild><Link href="/produk"><ShoppingBag size={17} aria-hidden /> Kembali belanja</Link></Button>
  </div>;
}

export function CartItemRow({ item, quote }: { item: CartItem; quote?: Quote["items"][number] }) {
  const cart = useCart();
  const quantity = Number(item.quantity);
  const stock = item.stock === undefined ? 99999 : Math.max(0, Math.min(99999, Number(item.stock)));
  const unavailable = item.active === false || stock < quantity;
  const product = item.product_id ? productHref({ id: item.product_id, name: item.product_name }) : undefined;
  const priceChanged = typeof item.baseline_price === "number" && typeof item.unit_price === "number" && item.baseline_price !== item.unit_price;
  const original = item.unit_price === undefined || item.unit_price === null ? undefined : Math.round(item.unit_price * quantity);
  const display = quote?.line_total ?? original;
  const savings = original !== undefined && display !== undefined ? Math.max(0, original - display) : 0;
  return <li className="shop-card shop-cart-row">
    <div className="shop-cart-image"><ProductImage name={item.product_name} url={item.image_url} sizes="88px" decorative /></div>
    <div className="shop-cart-item-name">{product ? <Link href={product}><strong>{item.product_name}</strong></Link> : <strong>{item.product_name}</strong>}
      <small>{item.unit_name}</small>
      {display !== undefined && <span className="mobile-line-total"><PriceText price={display} original={original} /></span>}
      {!!savings && <small className="shop-cart-savings">Hemat grosir {rupiah(savings)}</small>}
    </div>
    <span className="cart-unit-price">{rupiah(quote?.unit_price??item.unit_price??0)}</span><span className="cart-line-price">{display!==undefined?rupiah(display):"—"}</span>
    <button type="button" className="shop-icon shop-cart-remove" aria-label={"Hapus " + item.product_name + " " + item.unit_name} onClick={async () => { if (await alert.confirm({title:"Hapus dari keranjang?",text:item.product_name,danger:true})) await cart.remove(item.product_unit_id); }} disabled={cart.pending}><Trash2 size={16} aria-hidden /></button>
    <div className="shop-cart-qty"><QtyStepper label={item.product_name + " " + item.unit_name} quantity={quantity} min={0} max={stock} fractional={item.fractional}
      onChange={(value) => { if (!value) void cart.remove(item.product_unit_id); else if (value !== quantity) void cart.put(item.product_unit_id, amountString(value)); }} disabled={cart.pending || item.active === false || stock <= 0} /></div>
    {unavailable && <p className="shop-cart-alert" role="status">{item.active === false || stock === 0 ? "Satuan ini sudah tidak tersedia. Hapus dari keranjang untuk melanjutkan." : "Stok berubah. Tersedia " + quantityText(stock) + " " + item.unit_name + "."}</p>}
    {priceChanged && <p className="shop-cart-alert">Harga per satuan berubah dari {rupiah(item.baseline_price!)} menjadi {rupiah(item.unit_price!)}.</p>}
  </li>;
}

export function CustomerCart() {
  const cart = useCart();
  const [clearing,setClearing]=useState(false);
  const { reload } = cart;
  useEffect(() => { reload(); }, [reload]);
  const [zoneId, setZoneId] = useState("");
  const zones = useQuery(zonesQuery);
  const zone = zones.data?.data.find((item) => String(item.id) === zoneId);
  const signature = cart.items.map((item) => item.product_unit_id + ":" + item.quantity).join(",");
  const quote = useQuery({
    queryKey: ["quote", cart.token, signature, "cart"],
    queryFn: () => api<{ data: Quote }>("/orders/quote", "POST", { fulfillment: "pickup" }, false, cart.token ?? undefined),
    enabled: cart.ready && !!cart.token && cart.items.length > 0 && !cart.pending,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  const data = quote.data?.data;
  const minimum = zone?.minimum ?? 0;
  const shortfall = data ? Math.max(0, minimum - data.subtotal) : 0;
  const canCheckout = data && !shortfall && !quote.isFetching && !quote.isError && !cart.pending;
  const checkoutHref = "/checkout" + (zone ? "?zona=" + zone.id : "");
  if (cart.loadError) return <Failure error={cart.loadError} retry={cart.reload} />;
  if (!cart.ready) return <SkeletonCard />;
  if (!cart.items.length) return <><CartFeedback /><EmptyCart /></>;
  return <div className="shop-checkout-grid">
    <div><CartFeedback /><div className="cart-column-labels" aria-hidden><span>Produk / satuan</span><span>Harga</span><span>Jumlah</span><span>Total</span></div><ul className="shop-cart-list">{cart.items.map((item) => <CartItemRow key={item.product_unit_id} item={item} quote={data?.items.find((line) => line.product_unit_id === item.product_unit_id)} />)}</ul><Button variant="outline" disabled={clearing||cart.pending} onClick={async()=>{if(!await alert.confirm({title:"Kosongkan keranjang?",text:cart.items.length+" jenis barang akan dihapus.",danger:true}))return;setClearing(true);try{await alert.withLoading(async()=>{for(const item of cart.items){if(!await cart.remove(item.product_unit_id,true))throw new Error("Gagal menghapus barang");}},{loadingTitle:"Mengosongkan keranjang…",successMode:"toast",successTitle:"Keranjang dikosongkan"});}catch{cart.reload()}finally{setClearing(false)}}}><Trash2 size={16}/> Kosongkan keranjang</Button></div>
    <section className="panel shop-cart-summary">
      <h2>Ringkasan keranjang</h2>
      {zones.isError && <Failure error={zones.error} retry={() => zones.refetch()} />}
      {zones.data && <div className="shop-estimate"><span>Estimasi pengiriman</span><PillSelect label="Zona untuk estimasi ongkir" value={zoneId} options={[{ value: "", label: "Pilih zona" }, ...zones.data.data.map((item) => ({ value: String(item.id), label: item.name }))]} onChange={setZoneId} /></div>}
      {(quote.isFetching || cart.pending) && !data && <SkeletonCard />}
      {quote.isError && <Failure error={quote.error} retry={() => quote.refetch()} />}
      {data && <OrderSummary quote={data} shipping={zone?.fee ?? null} />}
      {!!minimum && data && <div className="shop-progress">
        <progress value={Math.min(minimum, data.subtotal)} max={minimum} aria-label="Progres minimum belanja zona" />
        <p>{shortfall ? "Tambah " + rupiah(shortfall) + " untuk minimum belanja " + zone?.name + "." : "Minimum belanja zona terpenuhi."}</p>
      </div>}
      {!zone && <p className="summary-note">Ambil di toko tanpa ongkir. Ongkir antar mengikuti zona yang Anda pilih.</p>}
      <div className="shop-cart-bar"><div><small>{zone ? "Estimasi total" : "Subtotal"}</small>{data ? <PriceText price={data.subtotal + (zone?.fee ?? 0)} /> : "—"}</div>
        {canCheckout ? <Button asChild><Link href={checkoutHref}>Lanjut ke checkout <ArrowRight size={16} aria-hidden /></Link></Button> : <Button disabled>Checkout <ArrowRight size={16} aria-hidden /></Button>}
      </div>
    </section>
  </div>;
}
