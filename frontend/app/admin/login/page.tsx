import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShoppingBasket } from "lucide-react";
import { AdminLogin } from "@/components/admin/admin";

export const metadata: Metadata = { title: "Masuk admin", robots: { index: false, follow: false } };

export default function LoginPage() {
  return <div className="admin-login">
    <div className="admin-login-inner">
      <Link href="/" className="back-link"><ArrowLeft size={17} aria-hidden /> Kembali ke toko</Link>
      <div className="admin-login-brand"><span className="brand-icon"><ShoppingBasket size={22} aria-hidden /></span><strong>Pasar Sembako</strong></div>
      <AdminLogin />
    </div>
  </div>;
}
