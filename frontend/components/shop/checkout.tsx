"use client";

import { customerAccount } from "@/lib/customer-account";
import { alert } from "@/lib/alert";

import { useActionMutation, useAlertForm } from "@/lib/alert/hooks";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Banknote, Landmark, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Failure, Field } from "@/components/feedback";
import { SkeletonCard } from "@/components/ui-shared/primitives";
import { useCart } from "@/components/providers";
import { api, rupiah } from "@/lib/api";
import { phoneSchema } from "@/lib/customer";
import { confirmationKey, saveConfirmation } from "@/lib/confirmation";
import type { Order, Quote } from "@/lib/types";
import { EmptyCart, zonesQuery } from "./cart";
import { CopyButton } from "./copy-button";
import { OrderSummary } from "./order-summary";
import { shopQuery } from "./support";

const schema = z
  .object({
    customer_name: z.string().trim().min(1, "Isi nama penerima.").max(120),
    phone: phoneSchema,
    email: z.union([z.literal(""), z.email("Periksa alamat email.")]),
    landmark: z.string().trim(),
    district: z.string().trim(),
    village: z.string().trim(),
    city: z.string().trim(),
    postcode: z.string().trim(),
    terms: z.boolean().refine(Boolean, "Setujui syarat belanja untuk melanjutkan."),
    fulfillment: z.enum(["pickup", "delivery"]),
    shipping_zone_id: z.string(),
    address: z.string().trim().max(500),
    note: z.string().trim().max(250, "Catatan maksimal 250 karakter."),
    payment_method: z.enum(["cod", "transfer"]),
  })
  .superRefine((data, context) => {
    if (contactNote(data).length > 250)
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "Catatan dan email bersama-sama maksimal 250 karakter.",
      });
    if (data.fulfillment !== "delivery") return;
    if (!data.shipping_zone_id)
      context.addIssue({ code: "custom", path: ["shipping_zone_id"], message: "Pilih zona pengiriman." });
    if (shippingAddress(data).length > 500)
      context.addIssue({
        code: "custom",
        path: ["address"],
        message: "Alamat lengkap maksimal 500 karakter.",
      });
    if (data.postcode && !/^\d{5}$/.test(data.postcode))
      context.addIssue({ code: "custom", path: ["postcode"], message: "Kode pos harus lima angka." });
    if (!data.address)
      context.addIssue({ code: "custom", path: ["address"], message: "Isi alamat pengiriman." });
  });

function contactNote(data: { note: string; email: string }) {
  return [data.note, data.email && "Email: " + data.email].filter(Boolean).join(" · ");
}
function shippingAddress(data: {
  address: string;
  landmark: string;
  village: string;
  district: string;
  city: string;
  postcode: string;
}) {
  return [
    data.address,
    data.landmark && "Patokan " + data.landmark,
    data.village,
    data.district,
    data.city,
    data.postcode,
  ]
    .filter(Boolean)
    .join(", ");
}
type Values = z.infer<typeof schema>;

export function PaymentOption({
  children,
  detail,
  icon,
  input,
}: {
  children: ReactNode;
  detail?: string;
  icon: ReactNode;
  input: ReactNode;
}) {
  return (
    <label className="shop-payment-option">
      {input}
      <span className="shop-payment-icon">{icon}</span>
      <span>
        <strong>{children}</strong>
        {detail && <small>{detail}</small>}
      </span>
    </label>
  );
}

export function Checkout({ initialZone }: { initialZone: string }) {
  const cart = useCart();
  const cache = useQueryClient();
  const router = useRouter();
  const writeLock = useRef(false);
  const form = useAlertForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_name: "",
      phone: "",
      terms: false,
      email: "",
      landmark: "",
      district: "",
      village: "",
      city: "",
      postcode: "",
      address: "",
      note: "",
      fulfillment: initialZone ? "delivery" : "pickup",
      shipping_zone_id: initialZone,
      payment_method: "cod",
    },
  });
  const [fulfillment, zoneId, payment] = useWatch({
    control: form.control,
    name: ["fulfillment", "shipping_zone_id", "payment_method"],
  });
  const delivery = fulfillment === "delivery";
  const zones = useQuery({ ...zonesQuery, enabled: delivery });
  const selectedZone = zones.data?.data.find((zone) => String(zone.id) === zoneId);
  const profile = useQuery({ ...shopQuery, enabled: payment === "transfer" });
  const transfer = profile.data?.data.transfer;
  const signature = cart.items.map((item) => item.product_unit_id + ":" + item.quantity).join(",");
  const quotePayload = { fulfillment, shipping_zone_id: delivery && zoneId ? Number(zoneId) : null };
  const quote = useQuery({
    queryKey: ["quote", cart.token, signature, quotePayload],
    queryFn: () =>
      api<{ data: Quote }>("/orders/quote", "POST", quotePayload, false, cart.token ?? undefined),
    enabled:
      cart.ready && !cart.pending && cart.items.length > 0 && !!cart.token && (!delivery || !!selectedZone),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  const submit = useActionMutation(
    {
      loadingTitle: "Membuat pesanan…",
      successTitle: "Pesanan berhasil dibuat",
      successMode: "modal",
      onInvalid: form.onInvalid,
    },
    {
      mutationFn: ({ values, token }: { values: Values; token: string }) =>
        api<{ data: Order }>(
          "/orders",
          "POST",
          {
            customer_name: values.customer_name,
            phone: values.phone,
            address: values.fulfillment === "delivery" ? shippingAddress(values) : "",
            note: contactNote(values),
            fulfillment: values.fulfillment,
            payment_method: values.payment_method,
            shipping_zone_id: values.fulfillment === "delivery" ? Number(values.shipping_zone_id) : null,
          },
          false,
          token,
        ),
      onSuccess: ({ data }, { token }) => {
        cache.setQueryData(confirmationKey, saveConfirmation(data));
        cart.clearAfterCheckout(token);
        void cache.invalidateQueries({ queryKey: ["products"] });
        router.replace("/pesanan/" + encodeURIComponent(data.code));
        router.refresh();
      },
      onError: () => {
        writeLock.current = false;
      },
    },
  );
  const warnedEmpty = useRef(false);
  useEffect(() => {
    if (cart.ready && !cart.items.length && !writeLock.current && !warnedEmpty.current) {
      warnedEmpty.current = true;
      void alert.warning("Keranjang masih kosong", "Pilih produk sebelum membuat pesanan.");
    }
  }, [cart.ready, cart.items.length]);
  const errors = form.formState.errors;
  const payable =
    !!cart.token &&
    !cart.pending &&
    quote.isSuccess &&
    !quote.isFetching &&
    !submit.isPending &&
    (!delivery || !!selectedZone);

  if (submit.isSuccess) return <SkeletonCard />;
  if (cart.loadError) return <Failure error={cart.loadError} retry={cart.reload} />;
  if (!cart.ready) return <SkeletonCard />;
  if (!cart.items.length) return <EmptyCart />;

  return (
    <form
      className="shop-checkout-grid"
      noValidate
      onSubmit={(event) =>
        void form.handleSubmit((values) => {
          if (!payable || !cart.token || writeLock.current) {
            if (!writeLock.current)
              void alert.warning(
                "Periksa ringkasan pesanan",
                "Pilih zona dan pastikan pesanan memenuhi minimum belanja.",
              );
            return;
          }
          writeLock.current = true;
          submit.mutate({ values, token: cart.token });
        })(event)
      }
    >
      <section className="panel form-stack">
        <h2>Data penerima</h2>
        {customerAccount && <Link href="/akun">Masuk ke akun pelanggan</Link>}{" "}
        <Field label="Nama lengkap" error={errors.customer_name?.message}>
          <Input autoComplete="name" {...form.register("customer_name")} />
        </Field>
        <Field label="Nomor HP" error={errors.phone?.message}>
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0812…"
            {...form.register("phone")}
          />
        </Field>
        <Field label="Catatan (opsional)" error={errors.note?.message}>
          <textarea
            className="control"
            rows={3}
            maxLength={250}
            placeholder="Contoh: titip di pos satpam"
            {...form.register("note")}
          />
        </Field>
        <Field label="Email (opsional, disertakan di catatan toko)" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </Field>
        <fieldset className="shop-radio-group">
          <legend>Cara menerima</legend>
          <PaymentOption
            icon={<Truck size={18} aria-hidden />}
            input={<input type="radio" value="delivery" {...form.register("fulfillment")} />}
          >
            Antar ke alamat
          </PaymentOption>
          <PaymentOption
            icon={<Store size={18} aria-hidden />}
            input={<input type="radio" value="pickup" {...form.register("fulfillment")} />}
            detail="Tanpa ongkir"
          >
            Ambil di toko
          </PaymentOption>
        </fieldset>
        {delivery && (
          <>
            {zones.isFetching && <SkeletonCard lines={2} />}
            {zones.isError && <Failure error={zones.error} retry={() => zones.refetch()} />}
            {zones.data && (
              <Field label="Zona pengiriman" error={errors.shipping_zone_id?.message}>
                <select className="control" {...form.register("shipping_zone_id")}>
                  <option value="">Pilih zona</option>
                  {zones.data.data.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} · {rupiah(zone.fee)}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {zoneId && zones.isSuccess && !selectedZone && (
              <p className="feedback failure">Zona ini sudah tidak tersedia. Pilih zona lain.</p>
            )}
            {selectedZone && (
              <p className="shop-muted">
                Ongkir {rupiah(selectedZone.fee)} · Minimum belanja {rupiah(selectedZone.minimum)}
              </p>
            )}
            <Field label="Alamat lengkap" error={errors.address?.message}>
              <textarea
                className="control"
                rows={3}
                autoComplete="street-address"
                {...form.register("address")}
              />
            </Field>
            <div className="form-grid">
              {(
                [
                  ["landmark", "Patokan"],
                  ["district", "Kecamatan"],
                  ["village", "Kelurahan"],
                  ["city", "Kota / kabupaten"],
                  ["postcode", "Kode pos"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label + " (opsional)"} error={errors[key]?.message}>
                  <Input {...form.register(key)} inputMode={key === "postcode" ? "numeric" : "text"} />
                </Field>
              ))}
            </div>
          </>
        )}
      </section>
      <section className="panel form-stack shop-cart-summary">
        <h2>Ringkasan pesanan</h2>
        {quote.isFetching && <SkeletonCard />}
        {quote.data && <OrderSummary quote={quote.data.data} showItems />}
        {quote.isError && <Failure error={quote.error} retry={() => quote.refetch()} />}
        <details className="shop-collapse" open>
          <summary>Metode pembayaran</summary>{" "}
          <fieldset className="shop-radio-group">
            <legend>Metode pembayaran</legend>
            <PaymentOption
              icon={<Banknote size={18} aria-hidden />}
              input={<input type="radio" value="cod" {...form.register("payment_method")} />}
              detail="Bayar saat pesanan diterima"
            >
              Bayar di tempat (COD)
            </PaymentOption>
            <PaymentOption
              icon={<Landmark size={18} aria-hidden />}
              input={<input type="radio" value="transfer" {...form.register("payment_method")} />}
              detail="Unggah bukti setelah memesan"
            >
              Transfer bank
            </PaymentOption>
          </fieldset>
          {payment === "transfer" && (
            <p>Unggah bukti transfer dari halaman konfirmasi setelah pesanan dibuat.</p>
          )}
          {payment === "transfer" &&
            (transfer?.account ? (
              <div className="shop-bank">
                <div>
                  <strong>
                    {transfer.bank} · {transfer.account}
                  </strong>
                  <p>{transfer.holder}</p>
                </div>
                <CopyButton label="Salin nomor rekening" value={transfer.account} />
              </div>
            ) : (
              <p className="shop-muted">
                {profile.isPending ? "Memuat rekening toko…" : "Hubungi toko untuk detail rekening."}
              </p>
            ))}
        </details>
        <Field label="Persetujuan" error={errors.terms?.message}>
          <span>
            <input type="checkbox" {...form.register("terms")} /> Saya menyetujui{" "}
            <Link href="/syarat" target="_blank">
              syarat belanja
            </Link>
            .
          </span>
        </Field>
        <Button type="submit" disabled={submit.isPending || quote.isFetching || cart.pending}>
          Buat pesanan
        </Button>
      </section>
    </form>
  );
}
