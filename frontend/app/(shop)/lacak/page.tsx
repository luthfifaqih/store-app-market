import { Tracking } from "@/components/shop/tracking";

export const metadata = { title: "Lacak Pesanan", robots: { index: false, follow: false } };

export default async function TrackingPage({ searchParams }: { searchParams: Promise<{ kode?: string }> }) {
  const { kode } = await searchParams;
  return <div className="shop-container page">
    <header className="shop-page-heading"><h1>Lacak pesanan</h1><p>Gunakan kode pesanan dan nomor HP pemesan.</p></header>
    <Tracking initialCode={typeof kode === "string" ? kode.slice(0, 24) : ""} />
  </div>;
}
