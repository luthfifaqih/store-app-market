"use client";

import { useActionMutation, useAlertForm } from "@/lib/alert/hooks";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Download } from "lucide-react";
import { Failure, Field, Pagination } from "@/components/feedback";
import { DataTable, EmptyState, SkeletonCard } from "./primitives";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, downloadSalesCsv, rupiah } from "@/lib/api";
import { dateWib, recentDates, type Sale, type SaleTotals } from "@/lib/admin";
import type { Collection } from "@/lib/types";

const schema = z.object({ from: z.iso.date("Pilih tanggal awal."), to: z.iso.date("Pilih tanggal akhir.") }).superRefine((dates, ctx) => {
  if (dates.to < dates.from) ctx.addIssue({ code: "custom", path: ["to"], message: "Tanggal akhir harus setelah atau sama dengan tanggal awal." });
  if ((Date.parse(dates.to) - Date.parse(dates.from)) / 86400000 >= 366) {
    ctx.addIssue({ code: "custom", path: ["to"], message: "Pilih rentang maksimal 366 hari." });
  }
});
type Filters = z.infer<typeof schema>;

export function AdminReports() {
  const [filters, setFilters] = useState(recentDates);
  const [page, setPage] = useState(1);
  const form = useAlertForm<Filters>({ resolver: zodResolver(schema), defaultValues: filters });
  const report = useQuery({
    queryKey: ["admin", "sales", filters, page],
    queryFn: () => api<Collection<Sale> & { summary: SaleTotals }>("/admin/reports/sales?" + new URLSearchParams({ ...filters, page: String(page) }), "GET", undefined, true),
  });
  const download = useActionMutation({ loadingTitle: "Mengekspor laporan…", successTitle: "Laporan diunduh", successMode: "toast", safeRetry: true }, { mutationFn: downloadSalesCsv });

  return <div className="form-stack">
    <Card className="panel">
      <form className="admin-filter-row" noValidate onSubmit={form.handleSubmit((values) => { setFilters(values); setPage(1); download.reset(); })}>
        <Field label="Dari tanggal" error={form.formState.errors.from?.message}><Input type="date" {...form.register("from")} /></Field>
        <Field label="Sampai tanggal" error={form.formState.errors.to?.message}><Input type="date" {...form.register("to")} /></Field>
        <Button type="submit" className="self-end">Terapkan filter</Button>
        <Button variant="outline" className="self-end" disabled={!report.isSuccess || download.isPending} onClick={() => download.mutate(filters)}>
          <Download size={17} aria-hidden /> {download.isPending ? "Mengunduh…" : "Ekspor CSV"}
        </Button>
      </form>
      
    </Card>
    {report.isPending && <SkeletonCard />}
    {report.isError && <Failure error={report.error} retry={() => report.refetch()} />}
    {report.data && <>
      <div className="admin-tiles">
        <Card className="admin-tile"><p>Pesanan selesai</p><strong>{report.data.summary.orders}</strong></Card>
        <Card className="admin-tile"><p>Subtotal produk</p><strong>{rupiah(report.data.summary.subtotal)}</strong></Card>
        <Card className="admin-tile"><p>Ongkir</p><strong>{rupiah(report.data.summary.shipping_fee)}</strong></Card>
        <Card className="admin-tile"><p>Total penjualan</p><strong>{rupiah(report.data.summary.total)}</strong></Card>
      </div>
      <Card className="panel">
        <h2>Transaksi selesai</h2>
        <p className="admin-date">{dateWib(filters.from)} sampai {dateWib(filters.to)} · WIB</p>
        {!report.data.data.length ? <EmptyState>Tidak ada pesanan selesai pada rentang ini.</EmptyState> :
          <DataTable label="Transaksi selesai" headings={["Kode order", "Selesai (WIB)", "Pelanggan", "Pembayaran", "Total"]}>
            {report.data.data.map((sale) => <tr key={sale.id}>
              <td><Link className="admin-record-link whitespace-nowrap" href={`/admin/pesanan?order=${sale.id}`}>{sale.code}</Link></td>
              <td className="whitespace-nowrap">{dateWib(sale.completed_at, true)}</td><td>{sale.customer_name}</td>
              <td>{sale.payment_method === "transfer" ? "Transfer" : "COD"}</td><td className="whitespace-nowrap">{rupiah(sale.total)}</td>
            </tr>)}
          </DataTable>}
        <Pagination page={page} last={report.data.meta.last_page} onPage={setPage} />
      </Card>
    </>}
  </div>;
}
