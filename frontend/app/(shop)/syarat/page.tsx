import { ShopStaticPage } from "@/components/shop/static-page";

export const metadata = { title: "Syarat Belanja", alternates: { canonical: "/syarat" } };

export default function TermsPage() {
  return <ShopStaticPage title="Syarat belanja">
    <h2>Harga dan stok</h2><p>Harga dan ketersediaan produk diperiksa kembali saat pesanan dibuat. Harga grosir mengikuti jumlah per satuan yang tertera.</p>
    <h2>Pengiriman</h2><p>Ongkos kirim dan minimum belanja mengikuti zona yang Anda pilih. Pesanan ambil di toko tidak dikenakan ongkos kirim.</p>
    <h2>Pembayaran</h2><p>Anda bisa membayar saat menerima pesanan atau melakukan transfer manual. Unggah bukti transfer dari halaman konfirmasi atau pelacakan agar toko dapat memeriksanya.</p>
  </ShopStaticPage>;
}
