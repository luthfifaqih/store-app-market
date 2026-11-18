"use client";

import { useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { PillTabs } from "@/components/ui-shared/primitives";
import { useCart } from "@/components/providers";
import { CartFeedback } from "@/components/cart-feedback";
import { Button } from "@/components/ui/button";
import type { Product, Unit } from "@/lib/types";
import { amountString, priceFor, quantityText } from "@/lib/shop";
import { PriceText } from "./price-text";
import { QtyStepper } from "./qty-stepper";

export function UnitSelector({ units, selected, onChange }: { units: Unit[]; selected: Unit; onChange: (unit: Unit) => void }) {
  return <div className="shop-unit-picker">
    <h2>Pilih satuan</h2>
    <PillTabs label="Satuan produk" value={String(selected.id)} options={units.map((unit) => ({ value: String(unit.id), label: unit.name }))} onChange={(id) => {
      const unit = units.find((item) => String(item.id) === id);
      if (unit) onChange(unit);
    }} />
  </div>;
}

export function WholesaleTable({ unit, minimum }: { unit: Unit; minimum: number }) {
  if (!unit.tiers.length) return null;
  return <section className="panel shop-wholesale">
    <h2>Harga Grosir</h2>
    <table><thead><tr><th scope="col">Minimum beli</th><th scope="col">Harga per {unit.name}</th></tr></thead>
      <tbody>{unit.tiers.map((tier) => <tr key={tier.min_quantity} data-active={minimum === Number(tier.min_quantity) || undefined}>
        <td>{quantityText(tier.min_quantity)} {unit.name}{minimum === Number(tier.min_quantity) && <span className="shop-badge">Aktif</span>}</td><td><PriceText price={tier.price} /></td>
      </tr>)}</tbody>
    </table>
  </section>;
}

function initialQuantity(unit: Unit) {
  const stock = Number(unit.stock);
  return unit.fractional ? Math.min(1, stock) : stock > 0 ? 1 : 0;
}

export function ProductPurchase({ product }: { product: Product }) {
  const router=useRouter();
  const cart = useCart();
  const [unit, setUnit] = useState(() => product.units.find((item) => Number(item.stock) > 0) ?? product.units[0]);
  const [quantity, setQuantity] = useState(() => unit ? initialQuantity(unit) : 0);
  if (!unit) return null;
  const remaining = Math.max(0, Number(amountString(Number(unit.stock) - Number(cart.items.find((item) => item.product_unit_id === unit.id)?.quantity ?? 0))));
  const minimum = unit.fractional ? 0.001 : 1;
  const amount = Math.min(quantity, remaining);
  const activePrice = priceFor(unit, amount);
  const total = Math.round(Number(amountString(amount * activePrice.price)));
  const blocked = amount < minimum || !cart.ready || cart.pending;
  const unitSnapshot = unit;
  async function add(buy=false) {
    const value = amountString(amount);
    if (await cart.add(unitSnapshot.id, value, { product_unit_id: unitSnapshot.id, product_id: product.id, product_name: product.name,
      unit_name: unitSnapshot.name, quantity: value, fractional: unitSnapshot.fractional, image_url: product.image_url, stock: unitSnapshot.stock, unit_price: unitSnapshot.price, active: true },buy ? "checkout" : false)) {
      setQuantity(initialQuantity(unitSnapshot));
      if(buy){alert.close();router.push("/checkout");}
    }
  }

  return <div className="shop-purchase" id="beli">
    <UnitSelector units={product.units} selected={unit} onChange={(next) => { setUnit(next); setQuantity(initialQuantity(next)); }} />
    <div className="shop-detail-price">
      <PriceText price={activePrice.price} original={unit.price} />
      <span className="shop-badge" data-tone={remaining === 0 ? "sold" : remaining <= 5 ? "limited" : undefined}>{remaining === 0 ? "Habis atau sudah di keranjang" : "Stok " + quantityText(remaining) + " " + unit.name}</span>
    </div>
    <WholesaleTable unit={unit} minimum={activePrice.minimum} />
    <div className="shop-detail-qty"><strong>Jumlah</strong><QtyStepper label={unit.name} quantity={amount} min={minimum} max={remaining} fractional={unit.fractional} onChange={setQuantity} disabled={remaining < minimum || cart.pending} /></div>
    <CartFeedback />
    <div className="shop-detail-action">
      <div><small>Subtotal</small><PriceText price={total} /></div>
      <Button type="button" disabled={blocked} onClick={()=>void add()}><ShoppingBag size={17} aria-hidden /> Tambah ke Keranjang</Button><Button variant="outline" disabled={blocked} onClick={()=>void add(true)}>Beli sekarang</Button>
    </div>
  </div>;
}
