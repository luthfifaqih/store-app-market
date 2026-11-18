import { Checkout } from "@/components/shop/checkout";

export const metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ zona?: string }> }) {
  const { zona } = await searchParams;
  return <div className="shop-container page"><header className="shop-page-heading"><h1>Checkout</h1></header><Checkout initialZone={typeof zona === "string" && /^[1-9]\d{0,14}$/.test(zona) ? zona : ""} /></div>;
}
