"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect,useState } from "react";
import { ArrowUp, Truck, Banknote, Boxes, ShieldCheck, MessageCircle, ShoppingBasket } from "lucide-react";
import type { Category } from "@/lib/types";
import { api } from "@/lib/api";

export type PublicShop = { name: string; address: string | null; phone: string | null; whatsapp: string | null; hours: string | null; info_bar: string | null; transfer: { bank: string | null; account: string | null; holder: string | null } };
export const shopQuery = { queryKey: ["shop-profile"], queryFn: () => api<{ data: PublicShop }>("/store"), staleTime: 60_000 };

export function WhatsAppButton({ number, floating = false }: { number?: string | null; floating?: boolean }) {
  const digits = (number || process.env.NEXT_PUBLIC_STORE_WHATSAPP || "").replace(/[\s()+-]/g, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return <a className={floating ? "shop-whatsapp shop-icon" : "shop-button-link"} href={"https://wa.me/" + digits} target="_blank" rel="noopener noreferrer" aria-label="Hubungi toko di WhatsApp"><MessageCircle size={21} aria-hidden />{!floating && "WhatsApp toko"}</a>;
}

export function ShopSupport({ contactOnly = false }: { contactOnly?: boolean }) {
  const pathname = usePathname();
  const profile = useQuery(shopQuery).data?.data;
  const categories=useQuery({queryKey:["categories"],queryFn:()=>api<{data:Category[]}>("/categories"),enabled:!contactOnly}).data?.data;
  const [up,setUp]=useState(false);
  useEffect(()=>{const check=()=>setUp(window.scrollY>600);window.addEventListener("scroll",check,{passive:true});return ()=>window.removeEventListener("scroll",check)},[]);
  const contact = <><p>{profile?.address || "Alamat toko belum dicantumkan."}</p>
    {profile?.hours && <p>{profile.hours}</p>}
    {profile?.phone && <a className="text-link" href={"tel:" + profile.phone}>{profile.phone}</a>}
    <WhatsAppButton number={profile?.whatsapp} /></>;
  if (contactOnly) return <div className="shop-contact">{contact}</div>;
  const purchase = pathname === "/keranjang" || pathname === "/checkout" || /^\/produk\/[^/]+$/.test(pathname);
  return <>
    <footer className="shop-footer"><div className="brush-edge" aria-hidden/><div className="feature-strip shop-container">{[[Truck,"Antar sesuai zona"],[Banknote,"Bayar aman / COD"],[Boxes,"Harga grosir"],[MessageCircle,"Layanan toko"],[ShieldCheck,"Stok terpantau"]].map(([icon,text])=>{const Icon=icon as typeof Truck;return <span key={String(text)}><Icon size={23}/>{String(text)}</span>})}</div><div className="shop-container shop-footer-grid">
      <div><Link className="shop-brand" href="/"><span><ShoppingBasket size={20} aria-hidden /></span>{profile?.name || "Pasar Sembako"}</Link><p>Kebutuhan dapur harian, eceran dan grosir.</p></div>
      {categories?.length ? <nav aria-label="Kategori populer"><strong>Kategori populer</strong>{categories.slice(0,4).map(c=><Link key={c.id} href={"/produk?kategori="+c.id}>{c.name}</Link>)}</nav>:null}<div className="shop-contact"><strong>Lokasi &amp; jam buka</strong>{contact}</div>
      <nav aria-label="Informasi toko"><strong>Butuh bantuan?</strong><Link href="/faq">FAQ</Link><Link href="/lokasi">Lokasi toko</Link><Link href="/tentang">Tentang</Link><Link href="/kontak">Kontak</Link><Link href="/syarat">Syarat belanja</Link><Link href="/admin">Masuk admin</Link></nav>
    </div><div className="shop-container footer-base"><span>© {new Date().getFullYear()} {profile?.name || "Pasar Sembako"}</span><span>COD · Transfer bank</span></div></footer>
    {up && !purchase && <button className="scroll-top shop-icon" aria-label="Kembali ke atas" onClick={()=>window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"})}><ArrowUp size={18}/></button>}
    {!purchase && <WhatsAppButton number={profile?.whatsapp} floating />}
  </>;
}
