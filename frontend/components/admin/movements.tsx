"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Failure, Pagination } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { dateWib, type Dashboard } from "@/lib/admin";
import type { Collection, Movement } from "@/lib/types";
import { DataTable, EmptyState, PageHeader, PillSelect, SearchField, SkeletonCard } from "./primitives";
import { ProductThumb } from "./product-thumb";

const reasonNames: Record<string, string> = { stok_awal: "Stok awal", pesanan: "Pesanan", pembatalan: "Pembatalan", penyesuaian: "Penyesuaian" };

export function AdminStock({ unitId, low }: { unitId?: number; low: boolean }) {
  return <>
    <PageHeader title="Stok" actions={<Button asChild><Link href="/admin#penyesuaian-stok">Sesuaikan stok</Link></Button>}>Pantau saldo satuan dan pergerakan stok.</PageHeader>
    <nav aria-label="Tampilan stok" className="admin-pill-tabs admin-content-toolbar">
      <Link aria-current={!low ? "page" : undefined} href="/admin/stok">Riwayat stok</Link>
      <Link aria-current={low ? "page" : undefined} href="/admin/stok?tab=menipis">Stok menipis</Link>
    </nav>
    {low ? <LowStock /> : <Movements key={unitId ?? "all"} unitId={unitId} />}
  </>;
}

function Movements({ unitId }: { unitId?: number }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const term = useDeferredValue(search.trim());
  const params = new URLSearchParams({ page: String(page) });
  if (unitId) params.set("unit_id", String(unitId));
  if (term) params.set("search", term);
  if (reason) params.set("reason", reason);
  const query = useQuery({ queryKey: ["admin", "movements", page, unitId, term, reason], queryFn: () => api<Collection<Movement>>("/admin/stock-movements?" + params, "GET", undefined, true) });
  return <section className="admin-panel">
    <div className="admin-toolbar admin-content-toolbar">
      {!unitId && <SearchField label="Cari produk" value={search} onChange={(value) => { setSearch(value); setPage(1); }} />}
      <PillSelect label="Alasan pergerakan" value={reason} options={[{ value: "", label: "Semua alasan" }, ...Object.entries(reasonNames).map(([value, label]) => ({ value, label }))]}
        onChange={(value) => { setReason(value); setPage(1); }} />
      {unitId && <Link className="admin-outline-action" href="/admin/stok">Lihat semua pergerakan</Link>}
    </div>
    {query.isPending && <SkeletonCard />}
    {query.isError && <Failure error={query.error} retry={() => query.refetch()} />}
    {query.data && (query.data.data.length ? <>
      <DataTable label="Riwayat stok" headings={["Waktu (WIB)", "Produk", "Perubahan", "Saldo", "Alasan", "Petugas"]}>
        {query.data.data.map((item) => <tr key={item.id}>
          <td className="whitespace-nowrap">{dateWib(item.created_at, true)}</td>
          <td><strong>{item.product_name}</strong><p>{item.unit_name}</p></td>
          <td>{Number(item.delta) > 0 ? "+" : ""}{Number(item.delta).toLocaleString("id-ID")}</td>
          <td>{Number(item.balance).toLocaleString("id-ID")}</td>
          <td>{reasonNames[item.reason] ?? item.reason}{item.note && <p>{item.note}</p>}{item.order_id && <Link className="admin-record-link" href={"/admin/pesanan?order=" + item.order_id}>Pesanan #{item.order_id}</Link>}</td>
          <td>{item.actor ?? "—"}</td>
        </tr>)}
      </DataTable>
      <Pagination page={page} last={query.data.meta.last_page} onPage={setPage} />
    </> : <EmptyState>Tidak ada pergerakan yang cocok.</EmptyState>)}
  </section>;
}

function LowStock() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const term = useDeferredValue(search.trim());
  const params = new URLSearchParams({ page: String(page) });
  if (term) params.set("search", term);
  const query = useQuery({
    queryKey: ["admin", "dashboard", "low-stock", page, term],
    queryFn: () => api<Collection<Dashboard["low_stock"][number]>>("/admin/low-stock?" + params, "GET", undefined, true),
  });
  return <section className="admin-panel">
    <div className="admin-toolbar admin-content-toolbar"><SearchField label="Cari produk" value={search} onChange={(value) => { setSearch(value); setPage(1); }} /></div>
    {query.isPending && <SkeletonCard />}
    {query.isError && <Failure error={query.error} retry={() => query.refetch()} />}
    {query.data && (query.data.data.length ? <>
      <DataTable label="Stok menipis" headings={["Produk", "Satuan", "Sisa stok", "Aksi"]}>
        {query.data.data.map((item) => <tr key={item.id}>
          <td><div className="admin-product-cell"><ProductThumb name={item.product_name} url={item.image_url} /><strong>{item.product_name}</strong></div></td>
          <td>{item.unit_name}</td><td><span className="admin-stock-pill">{Number(item.stock).toLocaleString("id-ID")}</span></td>
          <td><Link className="admin-outline-action" href={"/admin/produk?produk=" + item.product_id}>Lihat produk</Link></td>
        </tr>)}
      </DataTable>
      <Pagination page={page} last={query.data.meta.last_page} onPage={setPage} />
    </> : <EmptyState>Tidak ada satuan stok menipis yang cocok.</EmptyState>)}
  </section>;
}
