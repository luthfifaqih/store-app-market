"use client";
import { useQuery } from "@tanstack/react-query";
import { shopQuery, ShopSupport } from "./support";
import { useAlertForm } from "@/lib/alert/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field, Failure } from "@/components/feedback";
const schema = z.object({
  message: z.string().trim().min(1, "Tulis pesan untuk toko.").max(1000, "Pesan maksimal 1.000 karakter."),
});
export function StoreContact({ map = false }: { map?: boolean }) {
  const profile = useQuery(shopQuery);
  const form = useAlertForm({ resolver: zodResolver(schema), defaultValues: { message: "" } });
  const digits = (profile.data?.data.whatsapp ?? "").replace(/[\s()+-]+/g, "");
  const address = profile.data?.data.address;
  return (
    <>
      <ShopSupport contactOnly />
      {profile.isError && <Failure error={profile.error} retry={() => profile.refetch()} />}
      {address && (
        <>
          <iframe
            title="Peta lokasi toko"
            loading="lazy"
            className="store-map"
            referrerPolicy="no-referrer"
            src={"https://maps.google.com/maps?output=embed&q=" + encodeURIComponent(address)}
          />
          <a
            href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address)}
            target="_blank"
            rel="noreferrer"
          >
            Buka petunjuk arah
          </a>
        </>
      )}
      {!map && /^[1-9]\d{7,14}$/.test(digits) && (
        <form
          className="form-stack"
          noValidate
          onSubmit={form.handleSubmit(({ message }) =>
            window.open(
              "https://wa.me/" + digits + "?text=" + encodeURIComponent(message),
              "_blank",
              "noopener,noreferrer",
            ),
          )}
        >
          <Field label="Pesan untuk toko" error={form.formState.errors.message?.message}>
            <textarea className="control" {...form.register("message")} />
          </Field>
          <button className="store-cta">Buka pesan di WhatsApp</button>
        </form>
      )}
    </>
  );
}
