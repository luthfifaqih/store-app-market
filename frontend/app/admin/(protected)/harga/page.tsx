import { AdminHeading } from "@/components/admin/admin-frame";
import { AdminBulkPrices } from "@/components/admin/bulk-prices";

export const metadata = { title: "Harga massal" };

export default function Page() {
  return <><AdminHeading title="Harga massal">Atur harga eceran beberapa satuan sekaligus.</AdminHeading><AdminBulkPrices /></>;
}
