import { notFound } from "next/navigation";
import { Confirmation } from "@/components/shop/confirmation";

export const metadata = { title: "Konfirmasi pesanan", robots: { index: false, follow: false } };

export default async function OrderPage({ params }: { params: Promise<{ kode: string }> }) {
  const code = (await params).kode.toUpperCase();
  if (!/^PS-[A-F0-9]{16}$/.test(code)) notFound();
  return <div className="shop-container page"><Confirmation code={code} /></div>;
}
