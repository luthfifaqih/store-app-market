import { z } from "zod";
import { rupiah } from "@/lib/api";
import type { Order } from "@/lib/types";

const schema = z.object({
  code: z.string().regex(/^PS-[A-F0-9]{16}$/),
  total: z.number().int().nonnegative(),
  fulfillment: z.enum(["pickup", "delivery"]),
  payment_method: z.enum(["cod", "transfer"]),
  payment_status: z.enum(["menunggu", "ditinjau", "terverifikasi", "ditolak"]).optional(),
  store_whatsapp: z.string().nullable().optional(),
  transfer: z.object({ bank: z.string().nullable(), account: z.string().nullable(), holder: z.string().nullable() }).nullable().optional(),
});

export type ConfirmationOrder = z.infer<typeof schema>;
export const confirmationKey = ["customer-confirmation"];
const storageKey = "pasar-sembako-confirmation";

export function saveConfirmation(order: Order): ConfirmationOrder {
  const { code, total, fulfillment, payment_method, payment_status, transfer, store_whatsapp } = order;
  const receipt = { code, total, fulfillment, payment_method, payment_status, transfer, store_whatsapp };
  try { sessionStorage.setItem(storageKey, JSON.stringify(receipt)); } catch { /* Tetap tersedia lewat cache selama aplikasi terbuka. */ }
  return receipt;
}

export function readConfirmation(): ConfirmationOrder | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    const result = schema.safeParse(saved);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function storeWhatsAppLink(order: ConfirmationOrder): string | null {
  const number = (order.store_whatsapp || process.env.NEXT_PUBLIC_STORE_WHATSAPP || "").replace(/[\s()+-]/g, "");
  if (!/^[1-9]\d{7,14}$/.test(number)) return null;
  const message = [
    "Halo Pasar Sembako, saya ingin mengonfirmasi pesanan.",
    "",
    "Kode pesanan: " + order.code,
    "Total: " + rupiah(order.total),
    "Penerimaan: " + (order.fulfillment === "pickup" ? "Ambil di toko" : "Diantar"),
    "Pembayaran: " + (order.payment_method === "transfer" ? "Transfer bank" : "COD"),
    "",
    "Terima kasih.",
  ].join("\n");

  return "https://wa.me/" + number + "?text=" + encodeURIComponent(message);
}
