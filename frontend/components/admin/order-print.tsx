import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { paymentName, rupiah, statusName } from "@/lib/api";
import { dateWib, type StoreProfile } from "@/lib/admin";
import type { Order } from "@/lib/types";
import { AdminBackendUnavailable, getAdminData } from "@/lib/admin-session";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { PrintButton } from "@/components/admin/print-button";

export async function AdminOrderPrint({ id, document }: { id: string; document: "invoice" | "surat-jalan" }) {
  const data = await Promise.all([
    getAdminData<Order>("/orders/" + id),
    getAdminData<StoreProfile>("/settings"),
  ]).catch((error: unknown) => {
    if (!(error instanceof AdminBackendUnavailable)) throw error;
    return null;
  });
  if (!data) return <AdminUnavailable />;

  const [order, store] = data;
  const invoice = document === "invoice";
  const title = invoice ? "Invoice" : "Surat jalan";

  return <>
    <div className="print-toolbar">
      <Link href={`/admin/pesanan?order=${id}`} className="back-link"><ArrowLeft size={17} aria-hidden /> Kembali ke pesanan</Link>
      <PrintButton title={title} />
    </div>
    <PrintableOrder order={order} store={store} invoice={invoice} title={title} />
  </>;
}

function PrintableOrder({ order, store, invoice, title }: { order: Order; store: StoreProfile; invoice: boolean; title: string }) {
  return <article className="print-document">
    <header className="print-document-header">
      <div><p className="print-store-name">{store.name}</p>{store.address && <p className="whitespace-pre-line">{store.address}</p>}{store.phone && <p>{store.phone}</p>}</div>
      <div><h1>{title}</h1><strong>{order.code}</strong><p>{dateWib(order.created_at, true)} WIB</p></div>
    </header>
    <dl className="print-addresses">
      <div><dt>Penerima</dt><dd>{order.customer_name}</dd><dd>+{order.phone}</dd>{order.address && <dd className="whitespace-pre-line">{order.address}</dd>}</div>
      <div><dt>Penerimaan</dt><dd>{order.fulfillment === "pickup" ? "Ambil di toko" : order.zone_name || "Diantar"}</dd><dd>{statusName[order.status]}</dd>
        {invoice && <dd>{order.payment_method === "transfer" ? "Transfer bank" : "COD"} · {paymentName[order.payment_status]}</dd>}</div>
    </dl>
    <table className="data-table print-items">
      <thead><tr><th>Barang</th><th>Satuan</th><th>Jumlah</th>{invoice && <><th>Harga satuan</th><th>Subtotal</th></>}</tr></thead>
      <tbody>{order.items.map((item) => <tr key={item.product_unit_id}>
        <td>{item.product_name}</td><td>{item.unit_name}</td><td>{Number(item.quantity).toLocaleString("id-ID")}</td>
        {invoice && <><td>{rupiah(item.unit_price)}</td><td>{rupiah(item.line_total)}</td></>}
      </tr>)}</tbody>
    </table>
    {invoice ? <dl className="print-totals">
      <div><dt>Subtotal produk</dt><dd>{rupiah(order.subtotal)}</dd></div>
      <div><dt>Ongkir</dt><dd>{rupiah(order.shipping_fee)}</dd></div>
      <div><dt>Total</dt><dd>{rupiah(order.total)}</dd></div>
    </dl> : <div className="print-signatures"><div>Diserahkan oleh</div><div>Diterima oleh</div></div>}
  </article>;
}
