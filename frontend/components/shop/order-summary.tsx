import type { Quote } from "@/lib/types";
import { quantityText } from "@/lib/shop";
import { PriceText } from "./price-text";

export function OrderSummary({ quote, shipping = quote.shipping_fee, showItems = false }: {
  quote: Quote; shipping?: number | null; showItems?: boolean;
}) {
  return <div className="shop-order-summary">
    {showItems && <ul>{quote.items.map((item) => <li key={item.product_unit_id}><div><strong>{item.product_name}</strong><small>{quantityText(item.quantity)} {item.unit_name}</small></div><PriceText price={item.line_total} /></li>)}</ul>}
    <dl>
      <div><dt>Subtotal produk</dt><dd><PriceText price={quote.subtotal} /></dd></div>
      <div><dt>Ongkos kirim</dt><dd>{shipping === null ? "Sesuai zona" : shipping === 0 ? "Rp 0" : <PriceText price={shipping} />}</dd></div>
      <div className="shop-summary-total"><dt>{shipping === null ? "Subtotal" : "Total"}</dt><dd><PriceText price={quote.subtotal + (shipping ?? 0)} /></dd></div>
    </dl>
  </div>;
}
