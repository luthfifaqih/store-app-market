import { notFound } from "next/navigation";
import { AdminOrderPrint } from "@/components/admin/order-print";

export default async function PrintOrderPage({ params }: { params: Promise<{ id: string; dokumen: string }> }) {
  const { id, dokumen } = await params;
  if (!/^[1-9]\d{0,14}$/.test(id) || (dokumen !== "invoice" && dokumen !== "surat-jalan")) notFound();
  return <AdminOrderPrint id={id} document={dokumen} />;
}
