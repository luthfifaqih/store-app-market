"use client";

import { alert } from "@/lib/alert";

import { useActionMutation, useAlertForm } from "@/lib/alert/hooks";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Failure, Field } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { Banner } from "@/lib/types";

import { activeOptions, DataTable, EditorDialog, EmptyState, PageHeader, PillSelect, SearchField, SkeletonCard, StatusBadge } from "./primitives";

const url = z.url({ protocol: /^https?$/, error: "Gunakan URL HTTP atau HTTPS." }).max(500);
const schema = z.object({
  title: z.string().trim().min(1, "Isi judul banner.").max(150),
  image_url: url,
  link_url: z.union([z.literal(""), url]),
  position: z.number().int().min(0).max(65535),
  active: z.boolean(),
});
type Values = z.infer<typeof schema>;

export function AdminBanners() {
  const [editor, setEditor] = useState<Banner | "new">();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<typeof activeOptions[number]["value"]>("");
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "banners"], queryFn: () => api<{ data: Banner[] }>("/admin/banners", "GET", undefined, true) });
  function refresh() {
    void cache.invalidateQueries({ queryKey: ["admin", "banners"] });
    void cache.invalidateQueries({ queryKey: ["banners"] });
  }
  const remove = useActionMutation({ loadingTitle: "Menghapus banner…", successTitle: "Banner dihapus", successMode: "toast" }, {
    mutationFn: (id: number) => api<void>("/admin/banners/" + id, "DELETE", undefined, true),
    onSuccess: () => { refresh(); },
  });
  const rows = query.data?.data.filter((item) => item.title.toLowerCase().includes(search.trim().toLowerCase()) && (!status || item.active === (status === "active")));
  return <>
    <PageHeader title="Banner" actions={<Button onClick={() => setEditor("new")}><Plus size={17} aria-hidden /> Tambah banner</Button>} />
    <section className="admin-panel">
      <div className="admin-toolbar admin-content-toolbar">
        <SearchField label="Cari banner" value={search} onChange={setSearch} />
        <PillSelect label="Status banner" value={status} options={activeOptions} onChange={setStatus} />
      </div>
      {query.isPending && <SkeletonCard />}
      {query.isError && <Failure error={query.error} retry={() => query.refetch()} />}
      {rows && (rows.length ? <DataTable label="Daftar banner" headings={["Banner", "Posisi", "Status", "Aksi"]}>
        {rows.map((item) => <tr key={item.id}><td><strong>{item.title}</strong></td><td>{item.position}</td><td><StatusBadge status={item.active ? "aktif" : "nonaktif"}>{item.active ? "Aktif" : "Nonaktif"}</StatusBadge></td><td><div className="admin-actions">
          <Button variant="outline" aria-label={"Edit banner " + item.title} onClick={() => setEditor(item)}><Pencil size={16} aria-hidden /></Button>
          <Button variant="ghost" aria-label={"Hapus banner " + item.title} disabled={remove.isPending} onClick={async () => { if (await alert.confirm({title:"Hapus banner?", text:item.title, danger:true})) remove.mutate(item.id); }}><Trash2 size={16} aria-hidden /></Button>
        </div></td></tr>)}
      </DataTable> : <EmptyState>Tidak ada banner yang cocok.</EmptyState>)}
    </section>
    {editor && <EditorDialog title={editor === "new" ? "Tambah banner" : "Edit banner"} onClose={() => setEditor(undefined)}>
      <BannerForm banner={editor === "new" ? undefined : editor} close={() => setEditor(undefined)} saved={() => { refresh(); setEditor(undefined); }} />
    </EditorDialog>}
  </>;
}

function BannerForm({ banner, close, saved }: { banner?: Banner; close: () => void; saved: () => void }) {
  const form = useAlertForm<Values>({ resolver: zodResolver(schema), defaultValues: {
    title: banner?.title ?? "", image_url: banner?.image_url ?? "", link_url: banner?.link_url ?? "", position: banner?.position ?? 0, active: banner?.active ?? true,
  } });
  const save = useActionMutation({ loadingTitle: "Menyimpan banner…", successTitle: "Banner tersimpan", successMode: "toast", onInvalid: form.onInvalid }, {
    mutationFn: (values: Values) => api(banner ? `/admin/banners/${banner.id}` : "/admin/banners", banner ? "PUT" : "POST", values, true),
    onSuccess: saved,
  });
  return <form data-unsaved={form.formState.isDirty || undefined} className="form-stack" noValidate onSubmit={form.handleSubmit(async (values) => {
    if (banner?.active && !values.active && !await alert.confirm({title:"Nonaktifkan banner?",danger:true})) return;
    save.mutate(values);
  })}>
      <Field label="Judul banner" error={form.formState.errors.title?.message}><Input {...form.register("title")} /></Field>
      <Field label="URL gambar" error={form.formState.errors.image_url?.message}><Input type="url" {...form.register("image_url")} /></Field>
      <Field label="Tautan tujuan (opsional)" error={form.formState.errors.link_url?.message}><Input type="url" {...form.register("link_url")} /></Field>
      <Field label="Posisi tampil" error={form.formState.errors.position?.message}><Input type="number" min={0} max={65535} {...form.register("position", { valueAsNumber: true })} /></Field>
      <label className="flex gap-2 text-sm"><input type="checkbox" {...form.register("active")} /> Tampilkan di beranda</label>
      
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={save.isPending}>{save.isPending ? "Menyimpan…" : "Simpan banner"}</Button><Button variant="outline" disabled={save.isPending} data-close-editor onClick={close}>Tutup</Button></div>
    </form>;
}
