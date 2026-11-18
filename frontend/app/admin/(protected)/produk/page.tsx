import { AdminProducts } from "@/components/admin/products";

export const metadata = { title: "Produk" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ produk?: string }> }) {
  const { produk } = await searchParams;
  const id = typeof produk === "string" && /^[1-9]\d{0,14}$/.test(produk) ? Number(produk) : undefined;
  return <AdminProducts key={id ?? "all"} focusProduct={id} />;
}
