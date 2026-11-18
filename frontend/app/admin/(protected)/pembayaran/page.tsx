import { AdminOrders } from "@/components/admin/orders";
import { PageHeader } from "@/components/admin/primitives";

export const metadata = { title: "Pembayaran" };

export default function PaymentsPage() {
  return <><PageHeader title="Pembayaran">Periksa bukti transfer dan status pembayaran pesanan.</PageHeader><AdminOrders paymentOnly /></>;
}
