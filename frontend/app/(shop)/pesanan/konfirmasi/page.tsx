import { Confirmation } from "@/components/shop/confirmation";

export const metadata = { title: "Konfirmasi pesanan", robots: { index: false, follow: false } };

export default function OrderConfirmation() {
  return <div className="shop-container page"><Confirmation /></div>;
}
