"use client";

import { alert } from "@/lib/alert";

import { useActionMutation, useAlertForm } from "@/lib/alert/hooks";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Failure, Field } from "@/components/feedback";
import { api, rupiah } from "@/lib/api";
import type { Zone } from "@/lib/types";

import { activeOptions, DataTable, EditorDialog, EmptyState, PageHeader, PillSelect, SearchField, SkeletonCard, StatusBadge } from "./primitives";

const money = z.number().int().min(0, "Isi nilai 0 atau lebih.").max(100_000_000);
const schema = z.object({ name: z.string().trim().min(1, "Isi nama zona.").max(100), fee: money, minimum: money, active: z.boolean() });
type Values = z.infer<typeof schema>;

export function AdminZones() {
  const [editor, setEditor] = useState<Zone | "new">();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<typeof activeOptions[number]["value"]>("");
  const query = useQuery({ queryKey: ["admin", "zones"], queryFn: () => api<{ data: Zone[] }>("/admin/delivery-zones", "GET", undefined, true) });
  const rows = query.data?.data.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()) && (!status || item.active === (status === "active")));
  return <>
    <PageHeader title="Zona Pengiriman" actions={<Button onClick={() => setEditor("new")}><Plus size={17} aria-hidden /> Tambah zona</Button>} />
    <section className="admin-panel">
      <div className="admin-toolbar admin-content-toolbar">
        <SearchField label="Cari zona" value={search} onChange={setSearch} />
        <PillSelect label="Status zona" value={status} options={activeOptions} onChange={setStatus} />
      </div>
      {query.isPending && <SkeletonCard />}
      {query.isError && <Failure error={query.error} retry={() => query.refetch()} />}
      {rows && (rows.length ? <DataTable label="Daftar zona pengiriman" headings={["Zona", "Ongkir", "Minimum belanja", "Status", "Aksi"]}>
        {rows.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{rupiah(item.fee)}</td><td>{rupiah(item.minimum)}</td><td><StatusBadge status={item.active ? "aktif" : "nonaktif"}>{item.active ? "Aktif" : "Nonaktif"}</StatusBadge></td>
          <td><Button variant="outline" aria-label={"Edit zona " + item.name} onClick={() => setEditor(item)}><Pencil size={16} aria-hidden /></Button></td>
        </tr>)}
      </DataTable> : <EmptyState>Tidak ada zona pengiriman yang cocok.</EmptyState>)}
    </section>
    {editor && <EditorDialog title={editor === "new" ? "Tambah zona" : "Edit zona"} onClose={() => setEditor(undefined)}>
      <ZoneForm zone={editor === "new" ? undefined : editor} close={() => setEditor(undefined)} />
    </EditorDialog>}
  </>;
}

function ZoneForm({ zone, close }: { zone?: Zone; close: () => void }) {
  const cache = useQueryClient();
  const form = useAlertForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: zone?.name ?? "", fee: zone?.fee ?? 0, minimum: zone?.minimum ?? 0, active: zone?.active ?? true } });
  const save = useActionMutation({ loadingTitle: "Menyimpan zona…", successTitle: "Zona tersimpan", successMode: "toast", onInvalid: form.onInvalid }, {
    mutationFn: (values: Values) => api(zone ? `/admin/delivery-zones/${zone.id}` : "/admin/delivery-zones", zone ? "PUT" : "POST", values, true),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["admin", "zones"] });
      void cache.invalidateQueries({ queryKey: ["zones"] });
      void cache.invalidateQueries({ queryKey: ["quote"] });
      close();
    },
  });
  return <form data-unsaved={form.formState.isDirty || undefined} className="form-stack" noValidate onSubmit={form.handleSubmit(async (values) => {
    if (zone?.active && !values.active && !await alert.confirm({title:"Nonaktifkan zona?",danger:true})) return;
    save.mutate(values);
  })}>
    <Field label="Nama zona" error={form.formState.errors.name?.message}><Input {...form.register("name")} /></Field>
    <Field label="Ongkir tetap (Rp)" error={form.formState.errors.fee?.message}><Input type="number" min="0" {...form.register("fee", { valueAsNumber: true })} /></Field>
    <Field label="Minimum belanja (Rp)" error={form.formState.errors.minimum?.message}><Input type="number" min="0" {...form.register("minimum", { valueAsNumber: true })} /></Field>
    <label className="flex gap-2 text-sm"><input type="checkbox" {...form.register("active")} /> Zona aktif</label>
    
    <div className="flex gap-2"><Button type="submit" disabled={save.isPending}>{save.isPending ? "Menyimpan…" : "Simpan"}</Button><Button variant="outline" data-close-editor onClick={close} disabled={save.isPending}>Tutup</Button></div>
  </form>;
}
