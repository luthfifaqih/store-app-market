import type { Order, Quote } from "@/lib/types";
import { paymentName, rupiah, statusName } from "@/lib/api";

export function PriceSummary({ quote, subtotalOnly = false }: { quote: Quote; subtotalOnly?: boolean }) {
  return <div className="form-stack">
    {quote.items.map((item) => <div className="flex justify-between gap-3 text-sm" key={item.product_unit_id}>
      <div><strong>{item.product_name}</strong><p className="text-[#536a59]">{Number(item.quantity).toLocaleString("id-ID")} {item.unit_name} × {rupiah(item.unit_price)}</p></div>
      <span className="shrink-0">{rupiah(item.line_total)}</span>
    </div>)}
    <dl className="grid gap-2 border-t border-[#e2e8de] pt-3 text-sm">
      <div className="flex justify-between gap-3"><dt>Subtotal</dt><dd>{rupiah(quote.subtotal)}</dd></div>
      {!subtotalOnly && <>
      <div className="flex justify-between gap-3"><dt>Ongkir</dt><dd>{rupiah(quote.shipping_fee)}</dd></div>
      <div className="flex justify-between gap-3 border-t border-[#e2e8de] pt-3 text-lg font-bold text-[#174c33]"><dt>Total</dt><dd>{rupiah(quote.total)}</dd></div></>}
    </dl>
  </div>;
}

export function OrderDetails({ order }: { order: Order }) {
  return <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="!mb-0 break-all">{order.code}</h2>
      <span className="rounded-full bg-[#e8f4e7] px-3 py-1 text-sm font-semibold text-[#21583b]">{statusName[order.status]}</span>
    </div>
    <dl className="form-grid mb-5 text-sm">
      <div><dt className="font-semibold">Pemesan</dt><dd>{order.customer_name}</dd></div>
      <div><dt className="font-semibold">Pengiriman</dt><dd>{order.fulfillment === "pickup" ? "Ambil di toko" : order.zone_name}</dd>{order.address && <dd>{order.address}</dd>}</div>
      <div><dt className="font-semibold">Pembayaran</dt><dd>{order.payment_method === "cod" ? "COD · " : "Transfer · "}{paymentName[order.payment_status]}</dd></div>
    </dl>
    <PriceSummary quote={order} />
    {order.transfer && order.status === "pending" && order.payment_status !== "terverifikasi" && <div className="feedback mt-4">
      {order.transfer.account ? <span>Transfer ke <strong>{order.transfer.bank} {order.transfer.account}</strong> atas nama {order.transfer.holder}.</span>
        : <span>Hubungi toko untuk mendapatkan detail rekening transfer.</span>}
    </div>}
  </>;
}
