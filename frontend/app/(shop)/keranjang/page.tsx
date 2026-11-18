import { CustomerCart } from "@/components/shop/cart";

export const metadata = { title: "Keranjang", robots: { index: false, follow: false } };

export default function CartPage() {
  return <div className="shop-container page"><header className="shop-page-heading"><h1>Keranjang</h1></header><CustomerCart /></div>;
}
