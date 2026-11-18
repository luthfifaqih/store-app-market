"use client";

import { alert } from "@/lib/alert";

import { useActionMutation, useAlertForm } from "@/lib/alert/hooks";

import { useDeferredValue, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Failure, Field } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { Collection, Product } from "@/lib/types";
import { EmptyState, PillTabs, SearchField } from "./primitives";

const schema = z.object({
  unit: z.string().regex(/^\d+$/, "Pilih satuan produk."),
  quantity: z.string().trim().regex(/^\d{1,9}(?:[.,]\d{1,3})?$/, "Isi jumlah dengan maksimal tiga angka desimal.")
    .refine((value) => Number(value.replace(",", ".")) > 0, "Jumlah harus lebih besar dari nol."),
  note: z.string().trim().min(1, "Isi catatan penyesuaian.").max(250, "Catatan maksimal 250 karakter."),
});
const actions = [{ value: "add", label: "Tambah" }, { value: "subtract", label: "Kurangi" }] as const;
type StockValues = z.infer<typeof schema>;

export function QuickStock() {
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState<Product>();
  const [action, setAction] = useState<"add" | "subtract">("add");
  const cache = useQueryClient();
  const searchTerm = useDeferredValue(search.trim());
  const products = useQuery({
    queryKey: ["admin", "products", "stock-picker", searchTerm],
    queryFn: () => api<Collection<Product>>("/admin/products?" + new URLSearchParams(searchTerm ? { search: searchTerm } : {}), "GET", undefined, true),
  });
  const form = useAlertForm<StockValues>({ resolver: zodResolver(schema), defaultValues: { unit: "", quantity: "", note: "" } });
  const unitValue = useWatch({ control: form.control, name: "unit" });
  const list = products.data?.data ?? [];
  const selected = list.find((item) => item.id === product?.id) ?? product;
  const selectedUnit = selected?.units.find((unit) => unit.id === Number(unitValue));
  const save = useActionMutation({ loadingTitle: "Menyesuaikan stok…", successTitle: "Penyesuaian stok tersimpan", successMode: "toast", onInvalid: form.onInvalid }, {
    mutationFn: ({ unit, quantity, note }: StockValues) => api("/admin/units/" + unit + "/stock", "POST",
      { delta: (action === "subtract" ? "-" : "") + quantity.replace(",", "."), note }, true),
    onSuccess: async () => {
      form.reset({ unit: unitValue, quantity: "", note: "" });
      await Promise.all(["products", "dashboard", "movements"].map((key) => cache.invalidateQueries({ queryKey: ["admin", key] })));
      void cache.invalidateQueries({ queryKey: ["products"] });
    },
  });
  async function submit(values: StockValues) {
    if (selectedUnit && !selectedUnit.fractional && !Number.isInteger(Number(values.quantity.replace(",", ".")))) {
      form.setError("quantity", { message: "Satuan ini harus menggunakan jumlah bulat." });
      await form.invalid({ quantity: form.getFieldState("quantity").error });
      return;
    }
    if (await alert.confirm({title:"Sesuaikan stok satu satuan?",text:[selected?.name, action === "add" ? "Tambah" : "Kurangi",values.quantity,selectedUnit?.name].join(" ")})) save.mutate(values);
  }

  return <section className="admin-panel admin-quick-stock" id="penyesuaian-stok">
    <div className="admin-panel-title"><h2>Penyesuaian Stok Cepat</h2></div>
    <PillTabs label="Arah penyesuaian stok" value={action} options={actions} onChange={(value) => { setAction(value); save.reset(); }} />
    <form className="form-stack" noValidate onSubmit={form.handleSubmit(submit)}>
      <SearchField label="Cari produk" value={search} onChange={setSearch} />
      <Field label="Produk">
        <select className="control" value={selected?.id ?? ""} disabled={products.isPending} onChange={(event) => {
          const next = list.find((item) => item.id === Number(event.target.value));
          setProduct(next);
          form.setValue("unit", next?.units.length === 1 ? String(next.units[0].id) : "", { shouldValidate: form.formState.isSubmitted });
          save.reset();
        }}>
          <option value="">{products.isPending ? "Memuat produk…" : "Pilih produk"}</option>
          {selected && !list.some((item) => item.id === selected.id) && <option value={selected.id}>{selected.name}</option>}
          {list.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select>
      </Field>
      {products.isError && <Failure error={products.error} retry={() => products.refetch()} />}
      {products.isSuccess && !list.length && <EmptyState>Produk tidak ditemukan.</EmptyState>}
      <div className="admin-stock-fields">
        <Field label="Jumlah" error={form.formState.errors.quantity?.message}><Input inputMode="decimal" placeholder="0" aria-invalid={Boolean(form.formState.errors.quantity)} {...form.register("quantity")} /></Field>
        <Field label="Satuan" error={form.formState.errors.unit?.message}>
          <select className="control" disabled={!selected?.units.length} aria-invalid={Boolean(form.formState.errors.unit)} {...form.register("unit")}>
            <option value="">Pilih satuan</option>
            {selected?.units.map((unit) => <option value={unit.id} key={unit.id}>{unit.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Catatan" error={form.formState.errors.note?.message}><Input placeholder="Alasan penyesuaian" aria-invalid={Boolean(form.formState.errors.note)} {...form.register("note")} /></Field>
      
      <Button type="submit" disabled={save.isPending || !selected?.units.length}>{save.isPending ? "Menyimpan…" : "Simpan Penyesuaian"}</Button>
    </form>
  </section>;
}
