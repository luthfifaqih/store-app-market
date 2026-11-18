import { ShopStaticPage } from "@/components/shop/static-page";
import { StoreContact } from "@/components/shop/store-contact";

export const metadata = { title: "Kontak Toko", alternates: { canonical: "/kontak" } };

export default function ContactPage() {
  return <ShopStaticPage title="Kontak toko"><StoreContact /></ShopStaticPage>;
}
