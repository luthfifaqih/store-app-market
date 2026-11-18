import { AdminHeading } from "@/components/admin/admin-frame";
import { AdminOrders } from "@/components/admin/orders";
import { statusName } from "@/lib/api";

export const metadata = { title: "Pesanan" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ order?: string; status?: string }> }) {
  const { order, status } = await searchParams;
  const selected = typeof order === "string" && /^[1-9]\d{0,14}$/.test(order) ? Number(order) : undefined;
  const filter = typeof status === "string" && Object.hasOwn(statusName, status) ? status : "";
  return <><AdminHeading title="Pesanan">Kelola status pesanan dan verifikasi pembayaran transfer.</AdminHeading>
    <AdminOrders key={`${selected ?? "all"}-${filter}`} initialOrder={selected} initialStatus={filter} />
  </>;
}
