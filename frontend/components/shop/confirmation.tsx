"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MessageCircle, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, SkeletonCard, StatusBadge } from "@/components/ui-shared/primitives";
import { confirmationKey, readConfirmation, saveConfirmation, storeWhatsAppLink } from "@/lib/confirmation";
import { CopyButton } from "./copy-button";
import { PriceText } from "./price-text";
import { ProofUpload } from "./proof-upload";

export function Confirmation({ code }: { code?: string }) {
  const cache = useQueryClient();
  const query = useQuery({ queryKey: confirmationKey, queryFn: readConfirmation, staleTime: Infinity });
  const order = query.data && (!code || query.data.code === code) ? query.data : undefined;
  const knownCode = code || order?.code;
  const tracking = "/lacak" + (knownCode ? "?kode=" + encodeURIComponent(knownCode) : "");
  if (query.isPending) return <SkeletonCard />;
  if (!order) return <section className="panel shop-confirmation"><h1>Konfirmasi pesanan</h1>
    <EmptyState>Gunakan kode pesanan dan nomor HP untuk melihat detail pesanan.</EmptyState>
    <Button asChild><Link href={tracking}>Lacak pesanan</Link></Button>
  </section>;
  const whatsapp = storeWhatsAppLink(order);
  const canUpload = order.payment_method === "transfer" && (!order.payment_status || ["menunggu", "ditolak"].includes(order.payment_status));

  return <section className="panel shop-confirmation">
    <span className="confirmation-icon"><CheckCircle2 size={32} aria-hidden /></span>
    <h1>Pesanan berhasil dibuat</h1>
    <p className="shop-muted">Simpan kode ini untuk melacak pesanan Anda.</p>
    <dl className="shop-receipt">
      <div className="shop-receipt-code"><dt>Kode pesanan</dt><dd className="order-code">{order.code}</dd><dd><CopyButton value={order.code} label="Salin kode pesanan" /></dd></div>
      <div><dt>Total pembayaran</dt><dd><PriceText price={order.total} /></dd></div>
      {order.payment_method === "transfer" && order.payment_status && <div><dt>Bayar</dt><dd><StatusBadge status={order.payment_status} /></dd></div>}
    </dl>
    {order.payment_method === "transfer" && <p className="shop-muted">{order.transfer?.account
      ? <>Transfer ke <strong>{order.transfer.bank} {order.transfer.account}</strong>{order.transfer.holder ? " atas nama " + order.transfer.holder : ""}.</>
      : "Hubungi toko untuk detail rekening transfer."}</p>}
    <div className="shop-confirm-actions">
      {whatsapp && <Button asChild><a href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} aria-hidden /> Kirim ke WhatsApp Toko</a></Button>}
      <Button asChild variant="outline"><Link href={tracking}><PackageSearch size={17} aria-hidden /> Lacak Pesanan</Link></Button>
    </div>
    {canUpload && <details className="shop-collapse shop-confirm-proof">
      <summary>Unggah bukti transfer</summary>
      <ProofUpload code={order.code} onUploaded={(updated) => cache.setQueryData(confirmationKey, saveConfirmation(updated))} />
    </details>}
    {order.payment_status === "ditinjau" && <p className="feedback" role="status">Bukti diterima dan menunggu verifikasi.</p>}
  </section>;
}
