import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShopStaticPage({ title, children }: { title: string; children: ReactNode }) {
  return <div className="shop-container page">
    <Link className="back-link" href="/"><ArrowLeft size={16} aria-hidden /> Beranda</Link>
    <article className="panel shop-static"><h1>{title}</h1>{children}</article>
  </div>;
}

export function ShopNotFound() {
  return <ShopStaticPage title="Halaman tidak ditemukan">
    <span className="empty-icon"><PackageSearch size={25} aria-hidden /></span>
    <p>Alamat ini mungkin sudah berubah. Anda bisa kembali ke katalog untuk melanjutkan belanja.</p>
    <Button asChild><Link href="/produk">Buka katalog</Link></Button>
  </ShopStaticPage>;
}
