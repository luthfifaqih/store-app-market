"use client";

import { useActionMutation, useAlertForm } from "@/lib/alert/hooks";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Failure, Field } from "@/components/feedback";
import { SkeletonCard } from "./primitives";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { StoreProfile } from "@/lib/admin";

const schema = z.object({
  name: z.string().trim().min(1, "Isi nama toko.").max(120),
  address: z.string().trim().max(500),
  phone: z.string().trim().regex(/^(?:\+?[0-9 ()-]{6,25})?$/, "Masukkan nomor telepon yang valid."),
  whatsapp: z.string().trim().regex(/^(?:[1-9][0-9]{7,14})?$/, "Gunakan format internasional, misalnya 628123456789."),
  low_stock_threshold: z.number().int().min(0).max(10000),
  transfer_bank: z.string().trim().max(80),
  transfer_account: z.string().trim().regex(/^(?:[0-9]{4,40})?$/, "Masukkan nomor rekening 4–40 digit."),
  transfer_holder: z.string().trim().max(120),
}).superRefine((data, ctx) => {
  const fields = ["transfer_bank", "transfer_account", "transfer_holder"] as const;
  if (!fields.some((field) => data[field])) return;
  fields.filter((field) => !data[field]).forEach((field) => ctx.addIssue({ code: "custom", path: [field], message: "Lengkapi seluruh detail rekening." }));
});
type Values = z.infer<typeof schema>;

export function AdminSettings() {
  const query = useQuery({ queryKey: ["admin", "settings"], queryFn: () => api<{ data: StoreProfile }>("/admin/settings", "GET", undefined, true) });
  if (query.isPending) return <SkeletonCard />;
  if (query.isError) return <Failure error={query.error} retry={() => query.refetch()} />;
  return <SettingsForm profile={query.data.data} />;
}

function toValues(profile: StoreProfile): Values {
  return {
    name: profile.name, address: profile.address ?? "", phone: profile.phone ?? "", whatsapp: profile.whatsapp ?? "",
    low_stock_threshold: profile.low_stock_threshold, transfer_bank: profile.transfer_bank ?? "",
    transfer_account: profile.transfer_account ?? "", transfer_holder: profile.transfer_holder ?? "",
  };
}

function SettingsForm({ profile }: { profile: StoreProfile }) {
  const cache = useQueryClient();
  const form = useAlertForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(profile) });
  const save = useActionMutation({ loadingTitle: "Menyimpan pengaturan…", successTitle: "Pengaturan tersimpan", successMode: "toast", onInvalid: form.onInvalid }, {
    mutationFn: (values: Values) => api<{ data: StoreProfile }>("/admin/settings", "PUT", values, true),
    onSuccess: (result) => {
      cache.setQueryData(["admin", "settings"], result);
      form.reset(toValues(result.data));
      void cache.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
  const errors = form.formState.errors;
  return <form className="form-stack" noValidate onSubmit={form.handleSubmit((values) => save.mutate(values))}>
    <div className="admin-two-panels">
      <Card className="panel form-stack">
        <h2 className="!mb-0">Profil toko</h2>
        <Field label="Nama toko" error={errors.name?.message}><Input {...form.register("name")} /></Field>
        <Field label="Alamat toko" error={errors.address?.message}><textarea rows={3} className="control" {...form.register("address")} /></Field>
        <Field label="Nomor telepon" error={errors.phone?.message}><Input type="tel" {...form.register("phone")} /></Field>
        <Field label="WhatsApp toko" error={errors.whatsapp?.message}><Input type="tel" placeholder="628123456789" {...form.register("whatsapp")} /></Field>
        <Field label="Batas stok menipis per satuan" error={errors.low_stock_threshold?.message}><Input type="number" min={0} max={10000} {...form.register("low_stock_threshold", { valueAsNumber: true })} /></Field>
      </Card>
      <Card className="panel form-stack">
        <h2 className="!mb-0">Rekening transfer</h2>
        <Field label="Nama bank" error={errors.transfer_bank?.message}><Input {...form.register("transfer_bank")} /></Field>
        <Field label="Nomor rekening" error={errors.transfer_account?.message}><Input inputMode="numeric" {...form.register("transfer_account")} /></Field>
        <Field label="Nama pemilik rekening" error={errors.transfer_holder?.message}><Input {...form.register("transfer_holder")} /></Field>
      </Card>
    </div>
    
    <Button type="submit" className="justify-self-start" disabled={save.isPending || !form.formState.isDirty}>{save.isPending ? "Menyimpan…" : "Simpan pengaturan"}</Button>
  </form>;
}
