"use client";

import { alert } from "@/lib/alert";

import { useActionMutation, useAlertForm } from "@/lib/alert/hooks";

import { useState } from "react";
import { Archive, Pencil, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Failure, Field } from "@/components/feedback";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";
import { activeOptions, DataTable, EditorDialog, EmptyState, PageHeader, PillSelect, SearchField, SkeletonCard, StatusBadge } from "./primitives";

const schema = z.object({ name: z.string().trim().min(1, "Isi nama kategori.").max(80), active: z.boolean() });
type Values = z.infer<typeof schema>;
const key = ["admin", "categories"];

export function AdminCategories() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<typeof activeOptions[number]["value"]>("");
  const [editor, setEditor] = useState<Category | "new">();
  const cache = useQueryClient();
  const query = useQuery({ queryKey: key, queryFn: () => api<{ data: Category[] }>("/admin/categories", "GET", undefined, true) });
  const refresh = () => {
    for (const queryKey of [key, ["categories"], ["products"], ["admin", "products"], ["admin", "dashboard"]]) void cache.invalidateQueries({ queryKey });
  };
  const remove = useActionMutation({ loadingTitle: "Mengarsipkan kategori…", successTitle: "Kategori diarsipkan", successMode: "toast" }, {
    mutationFn: (id: number) => api("/admin/categories/" + id, "DELETE", undefined, true),
    onSuccess: () => { refresh(); },
  });
  const rows = query.data?.data.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()) && (!status || item.active === (status === "active")));
  return <>
    <PageHeader title="Kategori" actions={<Button onClick={() => setEditor("new")}><Plus size={17} aria-hidden /> Tambah kategori</Button>} />
    <section className="admin-panel">
      <div className="admin-toolbar admin-content-toolbar">
        <SearchField label="Cari kategori" value={search} onChange={setSearch} />
        <PillSelect label="Status kategori" value={status} options={activeOptions} onChange={setStatus} />
      </div>
      {query.isPending && <SkeletonCard />}
      {query.isError && <Failure error={query.error} retry={() => query.refetch()} />}
      {rows && (rows.length ? <DataTable label="Daftar kategori" headings={["Nama", "Status", "Aksi"]}>{rows.map((item) => <tr key={item.id}>
        <td><strong>{item.name}</strong></td>
        <td><StatusBadge status={item.active ? "aktif" : "nonaktif"}>{item.active ? "Aktif" : "Nonaktif"}</StatusBadge></td>
        <td><div className="admin-actions">
          <Button variant="outline" aria-label={"Edit kategori " + item.name} onClick={() => setEditor(item)}><Pencil size={16} aria-hidden /></Button>
          {item.active && <Button variant="ghost" aria-label={"Arsipkan kategori " + item.name} onClick={async () => { if (await alert.confirm({title:"Arsipkan kategori?", text:item.name, danger:true})) remove.mutate(item.id); }}><Archive size={16} aria-hidden /></Button>}
        </div></td>
      </tr>)}</DataTable> : <EmptyState>Tidak ada kategori yang cocok.</EmptyState>)}
    </section>
    {editor && <EditorDialog title={editor === "new" ? "Tambah kategori" : "Edit kategori"} onClose={() => setEditor(undefined)}>
      <CategoryForm category={editor === "new" ? undefined : editor} onSaved={() => { refresh(); setEditor(undefined); }} />
    </EditorDialog>}
  </>;
}

function CategoryForm({ category, onSaved }: { category?: Category; onSaved: () => void }) {
  const form = useAlertForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: category?.name ?? "", active: category?.active ?? true } });
  const save = useActionMutation({ loadingTitle: "Menyimpan kategori…", successTitle: "Kategori tersimpan", successMode: "toast", onInvalid: form.onInvalid }, {
    mutationFn: (values: Values) => api(category ? "/admin/categories/" + category.id : "/admin/categories", category ? "PUT" : "POST", values, true),
    onSuccess: onSaved,
  });
  return <form data-unsaved={form.formState.isDirty || undefined} className="form-stack" noValidate onSubmit={form.handleSubmit(async (values) => {
    if (category?.active && !values.active && !await alert.confirm({title:"Nonaktifkan kategori?",danger:true})) return;
    save.mutate(values);
  })}>
    <Field label="Nama kategori" error={form.formState.errors.name?.message}><Input {...form.register("name")} /></Field>
    <label className="flex gap-2 text-sm"><input type="checkbox" {...form.register("active")} /> Kategori aktif</label>
    
    <Button type="submit" disabled={save.isPending}>{save.isPending ? "Menyimpan…" : "Simpan kategori"}</Button>
  </form>;
}
