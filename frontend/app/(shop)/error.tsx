"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ShopError({ reset }: { reset: () => void }) {
  return <div className="shop-container page"><section className="panel shop-static" role="alert">
    <h1>Halaman belum bisa dibuka</h1><p>Coba muat ulang. Jika masalah berlanjut, kembali ke beranda.</p>
    <div className="shop-confirm-actions"><Button onClick={reset}>Coba lagi</Button><Button variant="outline" asChild><Link href="/">Beranda</Link></Button></div>
  </section></div>;
}
