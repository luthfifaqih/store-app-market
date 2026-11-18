import { AdminHeading } from "@/components/admin/admin-frame";
import { AdminReports } from "@/components/admin/reports";

export const metadata = { title: "Laporan penjualan" };

export default function Page() {
  return <><AdminHeading title="Laporan penjualan">Filter pesanan selesai berdasarkan tanggal dan unduh CSV.</AdminHeading><AdminReports /></>;
}
