import { AdminStock } from "@/components/admin/movements";

export const metadata = { title: "Stok" };

export default async function StockPage({ searchParams }: { searchParams: Promise<{ satuan?: string; tab?: string }> }) {
  const { satuan, tab } = await searchParams;
  const unit = typeof satuan === "string" && /^[1-9]\d{0,14}$/.test(satuan) ? Number(satuan) : undefined;
  return <AdminStock unitId={unit} low={tab === "menipis"} />;
}
