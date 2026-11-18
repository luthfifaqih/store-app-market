"use client";

import { alert } from "@/lib/alert";

import { useActionMutation, useAlertForm } from "@/lib/alert/hooks";

import Link from "next/link";
import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PackageSearch, Repeat2 } from "lucide-react";
import { Field } from "@/components/feedback";
import { useCart } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, SkeletonCard, StatusBadge } from "@/components/ui-shared/primitives";
import { api } from "@/lib/api";
import { phoneSchema } from "@/lib/customer";
import type { Order } from "@/lib/types";
import { OrderSummary } from "./order-summary";
import { ProofUpload } from "./proof-upload";
import { OrderTimeline } from "./timeline";

const schema = z.object({
  code: z.string().trim().toUpperCase().regex(/^PS-[A-F0-9]{16}$/, "Masukkan kode pesanan yang valid."),
  phone: phoneSchema,
});
type Credentials = z.infer<typeof schema>;

export function Tracking({ initialCode }: { initialCode: string }) {
  const [result, setResult] = useState<{ order: Order; phone: string }>();
  const form = useAlertForm<Credentials>({ resolver: zodResolver(schema), defaultValues: { code: initialCode, phone: "" } });
  const track = useActionMutation({ loadingTitle: "Mencari pesanan…", successTitle: "Pesanan ditemukan", successMode: "none", safeRetry: true, onInvalid: form.onInvalid }, {
    mutationFn: (credentials: Credentials) => api<{ data: Order }>("/orders/track", "POST", credentials),
    onMutate: () => setResult(undefined),
    onSuccess: ({ data }, submitted) => setResult({ order: data, phone: submitted.phone }),
  });
  const order = result?.order;
  const canUpload = order?.payment_method === "transfer" && order.status === "pending" && ["menunggu", "ditolak"].includes(order.payment_status);

  return <div className="shop-tracking-grid">
    <section className="panel">
      <form className="form-stack" noValidate onSubmit={form.handleSubmit((values) => { if (!track.isPending) track.mutate(values); })}>
        <Field label="Kode pesanan" error={form.formState.errors.code?.message}><Input autoCapitalize="characters" spellCheck={false} placeholder="PS-…" {...form.register("code")} /></Field>
        <Field label="Nomor HP" error={form.formState.errors.phone?.message}><Input type="tel" inputMode="tel" autoComplete="tel" placeholder="0812…" {...form.register("phone")} /></Field>
        <Button type="submit" disabled={track.isPending}><PackageSearch size={17} aria-hidden />{track.isPending ? "Mencari…" : "Cari pesanan"}</Button>
      </form>
      
    </section>
    {track.isPending && <SkeletonCard lines={4} />}
    {!order && !track.isPending && !track.isError && <EmptyState>Masukkan kode pesanan dan nomor HP yang digunakan saat checkout.</EmptyState>}
    {order && result && <section className="panel shop-tracking-result">
      <header><div><p>Status pesanan</p><h2 className="order-code">{order.code}</h2></div><StatusBadge status={order.status} /></header>
      <OrderTimeline order={order} />
      <section className="shop-track-details">
        <h2>Rincian pesanan</h2>
        <dl className="shop-review">
          <div><dt>Penerima</dt><dd>{order.customer_name}</dd></div>
          <div><dt>Pengiriman</dt><dd>{order.fulfillment === "pickup" ? "Ambil di toko" : order.zone_name ?? "Diantar"}</dd>{order.address && <dd>{order.address}</dd>}</div>
          <div><dt>Pembayaran</dt><dd>{order.payment_method === "cod" ? "COD" : "Transfer bank"} <StatusBadge status={order.payment_status} /></dd></div>
          {order.note && <div><dt>Catatan</dt><dd>{order.note}</dd></div>}
        </dl>
        <OrderSummary quote={order} showItems />
      </section>
      {canUpload && <details className="shop-collapse">
        <summary>Unggah bukti transfer</summary>
        {order.transfer?.account && <p className="shop-muted">Transfer ke <strong>{order.transfer.bank} {order.transfer.account}</strong>.</p>}
        <ProofUpload code={order.code} knownPhone={result.phone} onUploaded={(updated) => setResult({ ...result, order: updated })} />
      </details>}
      {order.payment_status === "ditinjau" && <p className="feedback" role="status">Bukti transfer sedang diperiksa toko.</p>}
      <Reorder key={order.id} items={order.items} />
    </section>}
  </div>;
}

function Reorder({ items }: { items: Order["items"] }) {
  const cart = useCart();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(0);

  async function reorder() {
    if (lock.current || !cart.ready || cart.pending) return;
    lock.current = true;
    setBusy(true);
    let count = 0;
    const skipped: string[] = [];
    try {
      await alert.withLoading(async () => {
      for (const item of items) {
        const preview = { ...item, fractional: !Number.isInteger(Number(item.quantity)) };
        if (await cart.add(item.product_unit_id, item.quantity, preview, true)) count++;
        else skipped.push(item.product_name + " (" + item.unit_name + ")");
      }
      setAdded(count);
      }, {loadingTitle:"Mengisi ulang keranjang…",successMode:"none"});
      if (skipped.length) await alert.warning("Sebagian barang belum ditambahkan",skipped.join(", "));
      else alert.toast("success","Pesanan ditambahkan ke keranjang");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return <div className="shop-reorder">
    <Button variant="outline" disabled={busy || !cart.ready || cart.pending || !items.length} onClick={() => void reorder()}><Repeat2 size={17} aria-hidden />{busy ? "Menambahkan…" : "Pesan Lagi"}</Button>
    {!!added && <Button asChild><Link href="/keranjang">Lihat keranjang</Link></Button>}
  </div>;
}
