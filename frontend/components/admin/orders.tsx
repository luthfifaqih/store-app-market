"use client";

import { alert } from "@/lib/alert";

import { useActionMutation } from "@/lib/alert/hooks";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Download, Printer } from "lucide-react";
import { Failure, Pagination } from "@/components/feedback";
import { OrderDetails } from "@/components/order-details";
import { Button } from "@/components/ui/button";
import { api, downloadProof, paymentName, rupiah, statusName } from "@/lib/api";
import type { Collection, Order, OrderStatus } from "@/lib/types";
import { DataTable, EditorDialog, EmptyState, PillSelect, SearchField, SkeletonCard, StatusBadge } from "./primitives";

const sequence: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "dikonfirmasi", dikonfirmasi: "diproses", diproses: "dikirim", dikirim: "selesai",
};

export function AdminOrders({ initialOrder, initialStatus = "", paymentOnly = false }: {
  initialOrder?: number; initialStatus?: string; paymentOnly?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [selected, setSelected] = useState<number | undefined>(initialOrder);
  const term = useDeferredValue(search.trim());
  const params = new URLSearchParams({ page: String(page) });
  if (term) params.set("search", term);
  if (paymentOnly) params.set("payment_method", "transfer");
  if (status) params.set(paymentOnly ? "payment_status" : "status", status);
  const query = useQuery({ queryKey: ["admin", "orders", paymentOnly, term, status, page], queryFn: () => api<Collection<Order>>("/admin/orders?" + params, "GET", undefined, true) });
  const statusOptions = Object.entries(paymentOnly ? paymentName : statusName).map(([value, label]) => ({ value, label }));

  return <>
    <section className="admin-panel">
      <div className="admin-toolbar admin-content-toolbar">
        <SearchField label="Cari kode atau pelanggan" value={search} onChange={(value) => { setSearch(value); setPage(1); }} />
        <PillSelect label={paymentOnly ? "Status pembayaran" : "Status pesanan"} value={status} options={[{ value: "", label: "Semua status" }, ...statusOptions]}
          onChange={(value) => { setStatus(value); setPage(1); }} />
      </div>
      {query.isPending && <SkeletonCard />}
      {query.isError && <Failure error={query.error} retry={() => query.refetch()} />}
      {query.data && (query.data.data.length ? <>
        <DataTable label={paymentOnly ? "Pembayaran transfer" : "Pesanan masuk"} headings={["Pesanan", "Status", "Total", "Aksi"]}>
          {query.data.data.map((order) => <tr key={order.id}>
            <td><strong className="whitespace-nowrap">{order.code}</strong><p>{order.customer_name}</p></td>
            <td><StatusBadge status={paymentOnly ? order.payment_status : order.status} /></td>
            <td className="whitespace-nowrap">{rupiah(order.total)}</td>
            <td><Button variant="outline" aria-label={"Detail pesanan " + order.code} onClick={() => setSelected(order.id)}><ArrowUpRight size={17} aria-hidden /></Button></td>
          </tr>)}
        </DataTable>
        <Pagination page={page} last={query.data.meta.last_page} onPage={setPage} />
      </> : <EmptyState>{paymentOnly ? "Tidak ada pembayaran transfer yang cocok." : "Tidak ada pesanan yang cocok."}</EmptyState>)}
    </section>
    {selected && <EditorDialog title={paymentOnly ? "Detail pembayaran" : "Detail pesanan"} wide onClose={() => setSelected(undefined)}><AdminOrder key={selected} id={selected} /></EditorDialog>}
  </>;
}

function AdminOrder({ id }: { id: number }) {
  const cache = useQueryClient();
  const key = ["admin", "order", id];
  const query = useQuery({ queryKey: key, queryFn: () => api<{ data: Order }>(`/admin/orders/${id}`, "GET", undefined, true) });
  const change = useActionMutation((v: {action:string; body:object}) => ({loadingTitle: v.action === "payment" ? "Memperbarui verifikasi…" : "Memperbarui status…",successMode: "status" in v.body && v.body.status === "dibatalkan" ? "modal" : "toast",successTitle: "status" in v.body && v.body.status === "dibatalkan" ? "Pesanan dibatalkan" : "Perubahan tersimpan"}), {
    mutationFn: ({ action, body }: { action: string; body: object }) => api<{ data: Order }>(`/admin/orders/${id}/${action}`, "PATCH", body, true),
    onSuccess: (response) => {
      cache.setQueryData(key, response);
      void cache.invalidateQueries({ queryKey: ["admin", "orders"] });
      void cache.invalidateQueries({ queryKey: ["admin", "products"] });
      void cache.invalidateQueries({ queryKey: ["products"] });
      void cache.invalidateQueries({ queryKey: ["admin", "movements"] });
      void cache.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      void cache.invalidateQueries({ queryKey: ["admin", "sales"] });
    },
  });
  const download = useActionMutation({ loadingTitle: "Mengunduh bukti…", successTitle: "Bukti diunduh", successMode: "toast", safeRetry: true }, { mutationFn: () => downloadProof(id) });

  if (query.isPending) return <SkeletonCard />;
  if (query.isError) return <Failure error={query.error} retry={() => query.refetch()} />;

  const order = query.data.data;
  const next = order.status === "diproses" && order.fulfillment === "pickup" ? "selesai" : sequence[order.status];
  const waiting = order.payment_method === "transfer" && order.status === "pending" && order.payment_status !== "terverifikasi";
  async function updateStatus(status: OrderStatus) {
    if (status === "dibatalkan") {
      const reason = await alert.confirmWithInput({title:"Batalkan pesanan dan kembalikan stok?",label:"Alasan pembatalan",placeholder:"Tulis alasan pembatalan",required:true});
      if (reason !== null) change.mutate({action:"status",body:{status,reason}});
    } else if (await alert.confirm({title:"Ubah status pesanan?",text:statusName[status]})) change.mutate({action:"status",body:{status}});
  }
  async function verify(decision: "terverifikasi" | "ditolak") {
    if (await alert.confirm({title:decision === "ditolak" ? "Tolak bukti bayar?" : "Verifikasi bukti bayar?",danger:decision === "ditolak"})) change.mutate({action:"payment",body:{decision}});
  }
  return <div>
    <OrderDetails order={order} />
    <p className="mt-3 text-sm">Kontak pemesan <a className="underline" href={`tel:+${order.phone}`}>+{order.phone}</a></p>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button variant="outline" asChild><Link href={"/admin/pesanan/" + id + "/invoice"}><Printer size={16} aria-hidden /> Invoice</Link></Button>
      <Button variant="outline" asChild><Link href={"/admin/pesanan/" + id + "/surat-jalan"}><Printer size={16} aria-hidden /> Surat jalan</Link></Button>
      {order.has_proof && <Button variant="outline" disabled={download.isPending} onClick={() => download.mutate()}><Download size={16} aria-hidden /> {download.isPending ? "Mengunduh…" : "Unduh bukti"}</Button>}
      {order.status === "pending" && order.payment_status === "ditinjau" && <>
        <Button disabled={change.isPending} onClick={() => verify("terverifikasi")}>Verifikasi transfer</Button>
        <Button variant="outline" disabled={change.isPending} onClick={() => verify("ditolak")}>Tolak bukti</Button>
      </>}
      {next && <Button disabled={change.isPending || waiting} onClick={() => updateStatus(next)}>
        {next === "dikonfirmasi" ? "Konfirmasi pesanan" : next === "diproses" ? "Mulai proses" : next === "dikirim" ? "Tandai dikirim" : "Selesaikan pesanan"}
      </Button>}
      {next && <Button variant="outline" disabled={change.isPending} onClick={() => updateStatus("dibatalkan")}>Batalkan pesanan</Button>}
    </div>
    
    
  </div>;
}
