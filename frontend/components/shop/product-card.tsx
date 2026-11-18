"use client";

import Link from "next/link";
import { openPanel } from "./panel-events";
import { useSaved,toggleSaved } from "./saved";
import { Eye,Heart,Plus } from "lucide-react";
import { useCart } from "@/components/providers";
import type { Product } from "@/lib/types";
import { amountString, priceFor, productHref, quantityText } from "@/lib/shop";
import { PriceText } from "./price-text";
import { QtyStepper } from "./qty-stepper";
import { ProductImage } from "./product-image";

export function ProductCard({ product, wholesale = false, moveSaved=false }: { product: Product; wholesale?: boolean; moveSaved?:boolean }) {
  const saved=useSaved().includes(product.id);
  const cart = useCart();
  const available = product.units.filter((unit) => Number(unit.stock) > 0);
  const candidates = available.length ? available : product.units;
  const unit = (wholesale && candidates.find((option) => option.tiers.length > 0)) || candidates[0];
  const stock = Number(unit?.stock ?? 0);
  const current = cart.items.find((item) => item.product_unit_id === unit?.id);
  const quantity = Number(current?.quantity ?? 0);
  const tier = unit && priceFor(unit, quantity || 1);
  const wholesaleTier = unit?.tiers[0];
  const shownPrice = wholesale && !current && wholesaleTier ? wholesaleTier.price : tier?.price;
  const href = productHref(product);

  const setQuantity = (value: number) => {
    if (!unit) return;
    if (!value) void cart.remove(unit.id);
    else void cart.put(unit.id, amountString(value));
  };
  const add = async () => {
    if (!unit) return;
    const amount = amountString(Math.min(1, stock));
    const ok=await cart.add(unit.id, amount, { product_unit_id: unit.id, product_id: product.id, product_name: product.name,
      unit_name: unit.name, quantity: amount, fractional: unit.fractional, image_url: product.image_url, stock: unit.stock, unit_price: unit.price, active: true });
    if (ok && moveSaved && saved) toggleSaved(product.id,true);
  };
  return <article className="shop-product shop-card">
    <div className="card-tools"><button aria-label={"Simpan "+product.name+" di wishlist"} aria-pressed={saved} onClick={()=>toggleSaved(product.id)}><Heart size={16} fill={saved?"currentColor":"none"}/></button><button aria-label={"Lihat cepat "+product.name} onClick={()=>openPanel({type:"quick",product})}><Eye size={16}/></button></div>
    <Link prefetch={false} href={href} className="shop-product-image" aria-label={product.name}>
      <ProductImage name={product.name} url={product.image_url} sizes="(min-width: 1024px) 245px, (min-width: 650px) 29vw, 45vw" decorative />
      <span className="shop-product-badges">{unit && shownPrice!==undefined && shownPrice<unit.price && <b className="sale-badge">−{Math.round(100*(1-shownPrice/unit.price))}%</b>}
        {product.units.some((option) => option.tiers.length > 0) && <span className="shop-badge">Grosir</span>}
        {stock <= 5 && <span className="shop-badge" data-tone={stock ? "limited" : "sold"}>{stock ? "Stok terbatas" : "Habis"}</span>}
      </span>
    </Link>
    <div className="shop-product-copy">
      <small>{product.category}</small>
      <h3><Link prefetch={false} href={href}>{product.name}</Link></h3>
      <p>{unit?.name || "Satuan tidak tersedia"}</p>
      <div className="shop-product-price">{shownPrice !== undefined && <PriceText price={shownPrice} original={unit?.price} />}
        {wholesale && !current && wholesaleTier && <small>Min. {quantityText(wholesaleTier.min_quantity)} {unit?.name}</small>}
      </div>
      <p className="card-stock-info">{stock ? "Tersedia: "+quantityText(stock)+" "+unit?.name : "Stok habis"}</p>
      <div className="shop-card-actions">
        {moveSaved?<button className="store-cta" disabled={!cart.ready||cart.pending||quantity>=stock} onClick={add}>Pindah ke keranjang</button>:quantity > 0 && unit ? <QtyStepper label={product.name} quantity={quantity} min={0} max={stock} fractional={unit.fractional} onChange={setQuantity} editable={false} disabled={!cart.ready || cart.pending} />
          : <button type="button" className="shop-icon shop-add" aria-label={"Tambah ke keranjang: " + product.name} onClick={add} disabled={!cart.ready || cart.pending || stock <= 0}><Plus size={18} aria-hidden /><span className="card-add-text">Tambah ke keranjang</span></button>}
      </div>
    </div>
  </article>;
}
