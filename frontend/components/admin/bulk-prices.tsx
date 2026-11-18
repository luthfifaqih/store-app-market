"use client";

import { alert } from "@/lib/alert";

import { useActionMutation } from "@/lib/alert/hooks";

import { useDeferredValue, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { z } from "zod";
import { Failure, Pagination } from "@/components/feedback";
import { DataTable, EmptyState, SearchField, SkeletonCard, StatusBadge } from "./primitives";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, rupiah } from "@/lib/api";
import type { Collection, Product } from "@/lib/types";

const price = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100_000_000));
type Edit = { original: number; value: string };

export function AdminBulkPrices() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const term = useDeferredValue(search.trim());
  const [changes, setChanges] = useState<Record<number, Edit>>({});
  const cache = useQueryClient();
  const params = new URLSearchParams({ page: String(page) });
  if (term) params.set("search", term);
  const query = useQuery({ queryKey: ["admin", "products", "bulk", page, term], queryFn: () => api<Collection<Product>>("/admin/products?" + params, "GET", undefined, true) });
  const rows = query.data?.data.flatMap((product) => product.units.map((unit) => ({ product, unit }))) ?? [];
  const entries = Object.entries(changes);
  const invalid = entries.some(([, edit]) => !price.safeParse(edit.value).success);
  const save = useActionMutation({ loadingTitle: "Memperbarui harga…", successTitle: "Harga massal berhasil diperbarui", successMode: "modal" }, {
    mutationFn: () => api<{ data: { updated: number } }>("/admin/units/prices", "PATCH", {
      prices: entries.map(([id, edit]) => ({ unit_id: Number(id), expected_price: edit.original, price: price.parse(edit.value) })),
    }, true),
    onSuccess: async () => {
      setChanges({});
      await Promise.all(["products", "quote"].map((key) => cache.invalidateQueries({ queryKey: [key] })));
      await cache.invalidateQueries({ queryKey: ["admin", "products"] });
      void cache.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });

  return <Card className="panel">
    <div className="admin-panel-title">
      <h2>Harga eceran per satuan</h2>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!entries.length || save.isPending} onClick={async () => { if (!await alert.confirm({title:"Buang perubahan harga?",text:entries.length + " perubahan belum disimpan.",danger:true})) return; setChanges({}); save.reset(); await cache.invalidateQueries({ queryKey: ["admin", "products"] }); }}>Batal perubahan</Button>
        <Button disabled={!entries.length || save.isPending} onClick={async () => { if (invalid || entries.length > 100) { await alert.validation({Harga: invalid ? "Isi harga bulat antara Rp 1 dan Rp 100.000.000." : "Pilih maksimal 100 satuan."}); return; } if (await alert.confirm({title:"Perbarui harga massal?",text:entries.length + " harga satuan akan berubah."})) save.mutate(); }}><Save size={17} aria-hidden /> Simpan {entries.length > 0 && `(${entries.length})`}</Button>
      </div>
    </div>
    <p className="admin-date">Perubahan bisa dikumpulkan dari beberapa halaman dan disimpan sekaligus, maksimal 100 satuan.</p>
    <div className="admin-toolbar admin-content-toolbar"><SearchField label="Cari produk" value={search} onChange={(value) => { setSearch(value); setPage(1); }} /></div>
    
    {invalid && <p className="feedback failure" role="alert">Isi setiap harga dengan bilangan bulat antara Rp 1 dan Rp 100.000.000.</p>}
    {entries.length > 100 && <p className="feedback failure" role="alert">Kurangi perubahan hingga maksimal 100 satuan.</p>}
    {query.isPending && <SkeletonCard />}
    {query.isError && <Failure error={query.error} retry={() => query.refetch()} />}
    {query.data && rows.length === 0 && <EmptyState>Tidak ada satuan yang cocok.</EmptyState>}
    {rows.length > 0 && <DataTable label="Harga eceran per satuan" headings={["Produk", "Satuan", "Harga sekarang", "Grosir tertinggi", "Harga baru (Rp)"]}>
      {rows.map(({ product, unit }) => <tr key={unit.id}>
        <td><strong>{product.name}</strong>{(!product.active || !unit.active) && <p><StatusBadge status="nonaktif">Nonaktif</StatusBadge></p>}</td><td>{unit.name}</td>
        <td className="whitespace-nowrap">{rupiah(unit.price)}</td><td className="whitespace-nowrap">{unit.tiers.length ? rupiah(Math.max(...unit.tiers.map((tier) => tier.price))) : "—"}</td>
        <td><Input type="text" inputMode="numeric" aria-label={`Harga baru ${product.name} (${unit.name})`} className="!min-w-25" maxLength={9} disabled={save.isPending}
          value={changes[unit.id]?.value ?? String(unit.price)} onChange={(event) => {
            const value = event.target.value;
            const original = changes[unit.id]?.original ?? unit.price;
            save.reset();
            setChanges((prev) => {
              const next = { ...prev };
              if (value === String(original)) delete next[unit.id];
              else next[unit.id] = { original, value };
              return next;
            });
          }} /></td>
      </tr>)}
    </DataTable>}
    {query.data && <Pagination page={page} last={query.data.meta.last_page} onPage={setPage} />}
  </Card>;
}
