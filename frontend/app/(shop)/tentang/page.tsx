import { ShopStaticPage } from "@/components/shop/static-page";

export const metadata = { title: "Tentang Toko", alternates: { canonical: "/tentang" } };

export default function AboutPage() {
  return <ShopStaticPage title="Tentang Pasar Sembako">
    <p>Pasar Sembako menyediakan kebutuhan dapur harian seperti beras, minyak, telur, dan bumbu. Pilih satuan eceran atau grosir sesuai kebutuhan rumah tangga dan usaha.</p>
    <p>Pesanan bisa diantar sesuai zona atau disiapkan untuk diambil langsung di toko.</p>
  </ShopStaticPage>;
}
