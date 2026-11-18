"use client";

import { alert } from "@/lib/alert";

import { useActionMutation, useAlertForm } from "@/lib/alert/hooks";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Upload } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/feedback";
import { phoneSchema } from "@/lib/customer";
import { api } from "@/lib/api";
import type { Order } from "@/lib/types";

const allowed = ["image/jpeg", "image/png", "application/pdf"];
const proofSchema = z.custom<File>((file) => typeof File !== "undefined" && file instanceof File)
  .refine((file) => allowed.includes(file.type), "Pilih file JPG, PNG, atau PDF.")
  .refine((file) => file.size > 0 && file.size <= 2 * 1024 * 1024, "Ukuran file maksimal 2 MB.");
const ownerSchema = z.object({ phone: phoneSchema });

export function ProofUpload({ code, knownPhone, onUploaded }: { code: string; knownPhone?: string; onUploaded: (order: Order) => void }) {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const form = useAlertForm({ resolver: zodResolver(ownerSchema), defaultValues: { phone: knownPhone ?? "" } });
  const proof = file ? proofSchema.safeParse(file) : undefined;
  const upload = useActionMutation({ loadingTitle: "Mengunggah bukti bayar…", successTitle: "Bukti transfer terkirim", successMode: "toast", onInvalid: form.onInvalid }, {
    mutationFn: async ({ phone, proof }: { phone: string; proof: File }) => {
      const body = new FormData();
      body.set("code", code);
      body.set("phone", phone);
      body.set("proof", proof);
      return api<{ data: Order }>("/orders/proof", "POST", body);
    },
    onSuccess: ({ data }) => onUploaded(data),
  });
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return <form className="form-stack shop-proof" noValidate onSubmit={form.handleSubmit(({ phone }) => {
    if (proof?.success && !upload.isPending) upload.mutate({ phone, proof: proof.data });
  })}>
    {!knownPhone && <Field label="Nomor HP pemesan" error={form.formState.errors.phone?.message}><Input type="tel" inputMode="tel" autoComplete="tel" {...form.register("phone")} /></Field>}
    <Field label="Bukti transfer (JPG, PNG, PDF · maks. 2 MB)" error={proof && !proof.success ? proof.error.issues[0].message : undefined}>
      <Input type="file" accept={allowed.join(",")} disabled={upload.isPending} onChange={(event) => {
        upload.reset();
        const chosen = event.target.files?.[0];
        setFile(chosen);
        if (chosen && !proofSchema.safeParse(chosen).success) void alert.warning("Bukti bayar tidak sesuai","Pilih JPG, PNG, atau PDF dengan ukuran maksimal 2 MB.");
        setPreview(chosen && proofSchema.safeParse(chosen).success ? URL.createObjectURL(chosen) : undefined);
      }} />
    </Field>
    {preview && file && <div className="shop-proof-preview">
      {file.type === "application/pdf" ? <a className="text-link" href={preview} target="_blank" rel="noopener noreferrer"><FileText size={17} aria-hidden /> Pratinjau PDF</a> :
        // eslint-disable-next-line @next/next/no-img-element -- Pratinjau file browser memakai blob URL sementara.
        <img src={preview} alt="Pratinjau bukti transfer yang dipilih" />}
      <span>{file.name}</span>
    </div>}
    
    <Button type="submit" disabled={!proof?.success || upload.isPending}><Upload size={17} aria-hidden />{upload.isPending ? "Mengunggah…" : "Unggah bukti"}</Button>
  </form>;
}
