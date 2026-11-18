"use client";

import { alert } from "@/lib/alert";

import { useActionMutation, useAlertForm } from "@/lib/alert/hooks";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Archive, ImagePlus, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Failure, Field, Pagination } from "@/components/feedback";
import { api, rupiah } from "@/lib/api";
import type { Category, Collection, Product, Unit } from "@/lib/types";

import { ProductThumb } from "./product-thumb";
import { EditorDialog, EmptyState, PageHeader, PillSelect, SearchField, SkeletonCard, StatusBadge } from "./primitives";

const productSchema = z.object({
  name: z.string().trim().min(1, "Isi nama produk.").max(150),
  category: z.string().trim().min(1, "Isi kategori.").max(80),
  description: z.string().trim().max(2000),
  image_url: z.union([z.literal(""), z.url({ protocol: /^https?$/ })]),
  active: z.boolean(),
});
const priceSchema = z.number().int().min(1, "Isi harga dalam Rupiah.").max(100_000_000);
const unitSchema = z.object({
  name: z.string().trim().min(1, "Isi nama satuan.").max(80),
  price: priceSchema, fractional: z.boolean(), active: z.boolean(),
  tiers: z.array(z.object({
    min_quantity: z.string().regex(/^\d{1,5}(\.\d{1,3})?$/, "Maksimal tiga angka desimal.").refine((value) => Number(value) > 0, "Jumlah harus lebih dari nol."),
    price: priceSchema,
  })).max(12),
});
const stockSchema = z.object({
  delta: z.string().regex(/^-?\d{1,9}(\.\d{1,3})?$/, "Masukkan angka dengan maksimal tiga desimal.").refine((value) => Number(value) !== 0, "Perubahan harus selain nol."),
  note: z.string().trim().min(1, "Isi alasan perubahan.").max(250),
});

type Editor = { type: "image"; product: Product } | { type: "product"; product?: Product } | { type: "unit"; product: Product; unit?: Unit } | { type: "stock"; product: Product; unit: Unit };

export function AdminProducts({ focusProduct }: { focusProduct?: number }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [editor, setEditor] = useState<Editor>();
  const cache = useQueryClient();
  const term = useDeferredValue(search.trim());
  const params = new URLSearchParams({ page: String(page) });
  if (term) params.set("search", term);
  if (category) params.set("category_id", category);
  const categories = useQuery({
    queryKey: ["admin", "categories"], queryFn: () => api<{ data: Category[] }>("/admin/categories", "GET", undefined, true),
    enabled: !focusProduct,
  });
  const products = useQuery({
    queryKey: ["admin", "products", page, focusProduct, term, category],
    queryFn: async () => {
      if (!focusProduct) return api<Collection<Product>>("/admin/products?" + params, "GET", undefined, true);
      const result = await api<{ data: Product }>("/admin/products/" + focusProduct, "GET", undefined, true);
      return { data: [result.data], meta: { current_page: 1, last_page: 1, total: 1 } };
    },
  });

  function saved() {
    const keys = [["admin", "products"], ["admin", "movements"], ["admin", "dashboard"], ["admin", "categories"], ["products"], ["categories"], ["quote"]];
    for (const queryKey of keys) void cache.invalidateQueries({ queryKey });
    setEditor(undefined);
  }

  const remove = useActionMutation({ loadingTitle: "Mengarsipkan dari katalog…", successTitle: "Arsip tersimpan", successMode: "toast" }, {
    mutationFn: (path: string) => api<void>(path, "DELETE", undefined, true),
    onSuccess: () => { saved(); },
  });

  async function confirmArchive(path: string, name: string) {
    remove.reset();
    if (await alert.confirm({ title:"Arsipkan dari katalog?", text:name, danger:true })) remove.mutate(path);
  }

  const close = () => setEditor(undefined);
  return <>
    <PageHeader title="Produk" actions={<div className="admin-actions">
      <Button variant="outline" asChild><Link href="/admin/harga">Harga massal</Link></Button>
      <Button onClick={() => setEditor({ type: "product" })}><Plus size={16} aria-hidden /> Tambah produk</Button>
    </div>}>Kelola katalog, satuan, harga grosir, dan stok.</PageHeader>
    <section className="admin-panel">
      {focusProduct ? <Link href="/admin/produk" className="back-link">Lihat semua produk</Link> : <div className="admin-toolbar admin-content-toolbar">
        <SearchField label="Cari produk" value={search} onChange={(value) => { setSearch(value); setPage(1); }} />
        <PillSelect label="Kategori produk" value={category} options={[{ value: "", label: "Semua kategori" }, ...(categories.data?.data ?? []).map((item) => ({ value: String(item.id), label: item.name }))]}
          onChange={(value) => { setCategory(value); setPage(1); }} />
      </div>}
      {categories.isError && <Failure error={categories.error} retry={() => categories.refetch()} />}
      {products.isPending && <SkeletonCard />}
      {products.isError && <Failure error={products.error} retry={() => products.refetch()} />}
      {products.data?.data.length === 0 && <EmptyState>Tidak ada produk yang cocok.</EmptyState>}
      <div className="grid gap-3">{products.data?.data.map((product) => <article key={product.id} className="admin-product-record">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="admin-product-cell"><ProductThumb name={product.name} url={product.image_url} />
            <div><h3>{product.name}</h3><small>{product.category}</small></div>
            <StatusBadge status={product.active ? "aktif" : "nonaktif"}>{product.active ? "Aktif" : "Nonaktif"}</StatusBadge>
          </div>
          <div className="admin-actions">
            <Button variant="outline" aria-label={"Edit produk " + product.name} onClick={() => setEditor({ type: "product", product })}><Pencil size={16} aria-hidden /></Button>
            <Button variant="outline" aria-label={"Unggah foto " + product.name} onClick={() => setEditor({ type: "image", product })}><ImagePlus size={16} aria-hidden /></Button>
            {product.active && <Button variant="ghost" aria-label={"Arsipkan produk " + product.name} disabled={remove.isPending} onClick={() => confirmArchive("/admin/products/" + product.id, product.name)}><Archive size={16} aria-hidden /></Button>}
          </div>
        </div>
        <details className="admin-units" open={Boolean(focusProduct)}>
          <summary>Satuan produk ({product.units.length})</summary>
          <ul>{product.units.map((unit) => <li key={unit.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <div><strong>{unit.name}</strong><p>{rupiah(unit.price)} · Stok {Number(unit.stock).toLocaleString("id-ID")}{!unit.active && " · Nonaktif"}</p></div>
            <div className="admin-actions">
              <Button variant="ghost" onClick={() => setEditor({ type: "unit", product, unit })}>Edit satuan</Button>
              <Button variant="outline" onClick={() => setEditor({ type: "stock", product, unit })}>Sesuaikan stok</Button>
              <Button variant="ghost" asChild><Link href={"/admin/stok?satuan=" + unit.id}>Riwayat</Link></Button>
              {unit.active && <Button variant="ghost" aria-label={"Arsipkan satuan " + unit.name} disabled={remove.isPending} onClick={() => confirmArchive("/admin/products/" + product.id + "/units/" + unit.id, product.name + " (" + unit.name + ")")}><Archive size={16} aria-hidden /></Button>}
            </div>
          </li>)}</ul>
          <Button variant="outline" className="mt-2" onClick={() => setEditor({ type: "unit", product })}><Plus size={15} aria-hidden /> Tambah satuan</Button>
        </details>
      </article>)}</div>
      {products.data && <Pagination page={page} last={products.data.meta.last_page} onPage={setPage} />}
    </section>
    {editor && <EditorDialog title={editor.type === "product" ? (editor.product ? "Edit produk" : "Tambah produk") :
      editor.type === "unit" ? (editor.unit ? "Edit satuan" : "Tambah satuan") : editor.type === "image" ? "Unggah foto" : "Sesuaikan stok"} wide={editor.type === "unit"} onClose={close}>
      {editor.type === "product" && <ProductForm product={editor.product} saved={saved} close={close} />}
      {editor.type === "unit" && <UnitForm product={editor.product} unit={editor.unit} saved={saved} close={close} />}
      {editor.type === "image" && <ProductImageForm product={editor.product} saved={saved} close={close} />}
      {editor.type === "stock" && <StockForm product={editor.product} unit={editor.unit} saved={saved} close={close} />}
    </EditorDialog>}
  </>;
}

type EditorActions = { saved: () => void; close: () => void };

function Actions({ pending, close }: { pending: boolean; close: () => void }) {
  return <div className="flex flex-wrap gap-2">
    <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan"}</Button>
    <Button variant="outline" disabled={pending} data-close-editor onClick={close}>Tutup</Button>
  </div>;
}

function ProductForm({ product, saved, close }: EditorActions & { product?: Product }) {
  type Values = z.infer<typeof productSchema>;
  const form = useAlertForm<Values>({ resolver: zodResolver(productSchema), defaultValues: {
    name: product?.name ?? "", category: product?.category ?? "", description: product?.description ?? "", image_url: product?.image_url ?? "", active: product?.active ?? true,
  } });
  const save = useActionMutation({ loadingTitle: "Menyimpan produk…", successTitle: "Produk tersimpan", successMode: "toast", onInvalid: form.onInvalid }, {
    mutationFn: (values: Values) => api(product ? `/admin/products/${product.id}` : "/admin/products", product ? "PUT" : "POST", values, true),
    onSuccess: saved,
  });
  return <><form data-unsaved={form.formState.isDirty || undefined} className="form-stack" noValidate onSubmit={form.handleSubmit(async (values) => {
      if (product?.active && !values.active && !await alert.confirm({title:"Nonaktifkan produk?",danger:true})) return;
      save.mutate(values);
    })}>
    <Field label="Nama produk" error={form.formState.errors.name?.message}><Input {...form.register("name")} /></Field>
    <Field label="Kategori" error={form.formState.errors.category?.message}><Input {...form.register("category")} /></Field>
    <Field label="Deskripsi" error={form.formState.errors.description?.message}><textarea className="control" rows={3} {...form.register("description")} /></Field>
    <Field label="URL foto (opsional)" error={form.formState.errors.image_url?.message}><Input type="url" {...form.register("image_url")} /></Field>
    <label className="flex gap-2 text-sm"><input type="checkbox" {...form.register("active")} /> Produk aktif</label>
    <Actions pending={save.isPending} close={close} />
  </form></>;
}

function UnitForm({ product, unit, saved, close }: EditorActions & { product: Product; unit?: Unit }) {
  type Values = z.infer<typeof unitSchema>;
  const form = useAlertForm<Values>({ resolver: zodResolver(unitSchema), defaultValues: {
    name: unit?.name ?? "", price: unit?.price, fractional: unit?.fractional ?? false, active: unit?.active ?? true,
    tiers: unit?.tiers ?? [],
  } });
  const tiers = useFieldArray({ control: form.control, name: "tiers" });
  const save = useActionMutation({ loadingTitle: "Menyimpan satuan…", successTitle: "Satuan tersimpan", successMode: "toast", onInvalid: form.onInvalid }, {
    mutationFn: (values: Values) => api(`/admin/products/${product.id}/units${unit ? `/${unit.id}` : ""}`, unit ? "PUT" : "POST", values, true),
    onSuccess: saved,
  });
  return <><p className="page-lead">{product.name}</p>
    <form data-unsaved={form.formState.isDirty || undefined} className="form-stack" noValidate onSubmit={form.handleSubmit(async (values) => {
      if (unit?.active && !values.active && !await alert.confirm({title:"Nonaktifkan satuan?",danger:true})) return;
      save.mutate(values);
    })}>
      <Field label="Nama satuan" error={form.formState.errors.name?.message}><Input placeholder="kg atau kemasan 5 kg" {...form.register("name")} /></Field>
      <Field label="Harga eceran (Rp)" error={form.formState.errors.price?.message}><Input type="number" min="1" max="100000000" {...form.register("price", { valueAsNumber: true })} /></Field>
      {unit ? <p className="text-sm">{unit.fractional ? "Jumlah desimal diperbolehkan" : "Jumlah bilangan bulat"}</p> :
        <label className="flex gap-2 text-sm"><input type="checkbox" {...form.register("fractional")} /> Izinkan jumlah desimal</label>}
      <label className="flex gap-2 text-sm"><input type="checkbox" {...form.register("active")} /> Satuan aktif</label>
      <fieldset className="form-stack admin-fieldset">
        <legend className="font-semibold">Harga grosir</legend>
        {tiers.fields.map((field, index) => <div className="form-grid items-start" key={field.id}>
          <Field label={`Min. jumlah ${index + 1}`} error={form.formState.errors.tiers?.[index]?.min_quantity?.message}><Input inputMode="decimal" {...form.register(`tiers.${index}.min_quantity`)} /></Field>
          <Field label={`Harga ${index + 1} (Rp)`} error={form.formState.errors.tiers?.[index]?.price?.message}><Input type="number" min="1" max="100000000" {...form.register(`tiers.${index}.price`, { valueAsNumber: true })} /></Field>
          <Button variant="ghost" className="justify-self-start" onClick={() => tiers.remove(index)}>Hapus tingkat {index + 1}</Button>
        </div>)}
        <Button variant="outline" disabled={tiers.fields.length >= 12} onClick={() => tiers.append({ min_quantity: "", price: 1 })}>Tambah tingkat grosir</Button>
      </fieldset>
      <Actions pending={save.isPending} close={close} />
    </form>
  </>;
}

function StockForm({ product, unit, saved, close }: EditorActions & { product: Product; unit: Unit }) {
  type Values = z.infer<typeof stockSchema>;
  const form = useAlertForm<Values>({ resolver: zodResolver(stockSchema), defaultValues: { delta: "", note: "" } });
  const save = useActionMutation({ loadingTitle: "Menyesuaikan stok…", successTitle: "Stok diperbarui", successMode: "toast", onInvalid: form.onInvalid }, { mutationFn: (values: Values) => api(`/admin/units/${unit.id}/stock`, "POST", values, true), onSuccess: saved });
  return <><p className="page-lead">{product.name} · {unit.name} · Stok {Number(unit.stock).toLocaleString("id-ID")}</p>
    <form data-unsaved={form.formState.isDirty || undefined} className="form-stack" noValidate onSubmit={form.handleSubmit(async (values) => { if (await alert.confirm({title:"Sesuaikan stok satu satuan?",text:product.name + " · " + values.delta + " " + unit.name})) save.mutate(values); })}>
      <Field label="Perubahan jumlah (positif atau negatif)" error={form.formState.errors.delta?.message}><Input type="number" step={unit.fractional ? "0.001" : "1"} {...form.register("delta")} /></Field>
      <Field label="Alasan" error={form.formState.errors.note?.message}><Input {...form.register("note")} /></Field>
      <Actions pending={save.isPending} close={close} />
    </form>
  </>;
}

function ProductImageForm({ product, saved, close }: EditorActions & { product: Product }) {
  const [file, setFile] = useState<File>();
  const fileSchema = z.custom<File>((value) => value instanceof File)
    .refine((value) => ["image/jpeg", "image/png", "image/webp"].includes(value.type), "Pilih foto JPG, PNG, atau WebP.")
    .refine((value) => value.size > 0 && value.size <= 2 * 1024 * 1024, "Ukuran foto maksimal 2 MB.");
  const image = file ? fileSchema.safeParse(file) : undefined;
  const upload = useActionMutation({ loadingTitle: "Mengunggah foto…", successTitle: "Foto tersimpan", successMode: "toast" }, {
    mutationFn: (image: File) => {
      const payload = new FormData();
      payload.set("image", image);
      return api("/admin/products/" + product.id + "/image", "POST", payload, true);
    },
    onSuccess: saved,
  });
  return <><p className="page-lead">{product.name}</p>
    <form data-unsaved={!!file || undefined} className="form-stack" noValidate onSubmit={(event) => { event.preventDefault(); if (image?.success && !upload.isPending) upload.mutate(image.data); }}>
      <Field label="JPG, PNG, atau WebP (maks. 2 MB)" error={image && !image.success ? image.error.issues[0].message : undefined}>
        <Input type="file" accept="image/jpeg,image/png,image/webp" disabled={upload.isPending} onChange={(event) => { upload.reset(); const chosen = event.target.files?.[0]; setFile(chosen); if (chosen && !fileSchema.safeParse(chosen).success) void alert.warning("Foto tidak sesuai","Pilih JPG, PNG, atau WebP dengan ukuran maksimal 2 MB."); }} />
      </Field>
      
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!image?.success || upload.isPending}>{upload.isPending ? "Mengunggah…" : "Unggah foto"}</Button>
        <Button variant="outline" disabled={upload.isPending} data-close-editor onClick={close}>Tutup</Button></div>
    </form>
  </>;
}
