export type Staff = { id: number; name: string; email: string };
export type StoreProfile = {
  name: string; address: string | null; phone: string | null; whatsapp: string | null;
  low_stock_threshold: number; transfer_bank: string | null; transfer_account: string | null; transfer_holder: string | null;
};
export type SaleTotals = { orders: number; subtotal: number; shipping_fee: number; total: number };
export type Sale = {
  id: number; code: string; customer_name: string; payment_method: "cod" | "transfer"; fulfillment: "pickup" | "delivery";
  subtotal: number; shipping_fee: number; total: number; completed_at: string;
};
export type Dashboard = {
  today: string; sales_today: SaleTotals; sales_week: SaleTotals; pending_count: number;
  low_stock_count: number; low_stock_threshold: number;
  pending_orders: { id: number; code: string; customer_name: string; total: number; created_at: string }[];
  low_stock: { id: number; product_id: number; product_name: string; unit_name: string; stock: string; image_url: string | null }[];
};

export type DashboardPoint = { label: string; value: number };
export type BestSeller = {
  unit_id: number; product_id: number; product_name: string; unit_name: string; price: number;
  image_url: string | null; quantity: number; change: number | null; trend: number[];
};
export type DashboardAnalytics = {
  sales_yesterday: number; sales_month: SaleTotals; sales_previous_month: number;
  processing_count: number; low_stock_trend: number[];
  stat_trends: { today: number[]; month: number[]; pending: DashboardPoint[]; processing: DashboardPoint[] };
  sales_chart: { total: number; points: DashboardPoint[] };
  recent_orders: { id: number; code: string; customer_name: string; status: import("./types").OrderStatus; total: number; created_at: string }[];
  best_sellers: BestSeller[];
};

const wibDate = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });
const wibDateTime = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export function dateWib(value: string, withTime = false): string {
  return (withTime ? wibDateTime : wibDate).format(new Date(value));
}

export function recentDates() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const today = ["year", "month", "day"].map((key) => parts.find((part) => part.type === key)?.value).join("-");
  const first = new Date(today + "T00:00:00Z");
  first.setUTCDate(first.getUTCDate() - 6);
  return { from: first.toISOString().slice(0, 10), to: today };
}
