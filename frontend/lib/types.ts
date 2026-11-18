export type Category = { id: number; name: string; active: boolean };
export type Banner = { id: number; title: string; image_url: string; link_url: string | null; position: number; active: boolean };
export type Tier = { min_quantity: string; price: number };
export type Unit = { id: number; name: string; price: number; stock: string; fractional: boolean; active: boolean; tiers: Tier[] };
export type Product = { id: number; name: string; category_id: number; category: string; description: string | null; image_url: string | null; active: boolean; units: Unit[] };
export type Zone = { id: number; name: string; fee: number; minimum: number; active: boolean };
export type OrderStatus = "pending" | "dikonfirmasi" | "diproses" | "dikirim" | "selesai" | "dibatalkan";
export type Quote = {
  subtotal: number; shipping_fee: number; total: number;
  items: { product_unit_id: number; product_name: string; unit_name: string; quantity: string; unit_price: number; line_total: number; base_price?: number }[];
};
export type Order = Quote & {
  id: number; code: string; status: OrderStatus; fulfillment: "pickup" | "delivery";
  payment_method: "cod" | "transfer"; payment_status: "menunggu" | "ditinjau" | "terverifikasi" | "ditolak";
  customer_name: string; phone: string; address: string | null; zone_name: string | null;
  has_proof: boolean; created_at: string; completed_at?: string | null; store_whatsapp?: string | null;
  note?: string | null;
  transfer: { bank: string | null; account: string | null; holder: string | null } | null;
};
export type Movement = { id: number; product_unit_id: number; unit_name: string; product_name: string; order_id: number | null; delta: string; balance: string; reason: string; note: string | null; actor?: string | null; created_at: string };
export type Collection<T> = { data: T[]; meta: { current_page: number; last_page: number; total: number } };
export type CartItem = { product_id?: number; image_url?: string | null; stock?: string; unit_price?: number | null; baseline_price?: number; active?: boolean; product_unit_id: number; product_name: string; unit_name: string; quantity: string; fractional: boolean };
