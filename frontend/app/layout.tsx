import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { siteUrl } from "@/lib/site";
import "@fontsource-variable/inter/index.css";
import "@/components/ui-shared/tokens.css";
import "./globals.css";
import "@/styles/swal.css";
import "./(shop)/shop.css";
import "@/styles/storefront.css";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  openGraph: {
    siteName: "Pasar Sembako", type: "website", locale: "id_ID",
    title: "Pasar Sembako", description: "Belanja kebutuhan dapur harian, eceran dan grosir.",
    images: [{ url: "/hero.webp", alt: "Bahan pokok Pasar Sembako" }],
  },
  title: { default: "Pasar Sembako | Belanja kebutuhan harian", template: "%s | Pasar Sembako" },
  description: "Belanja kebutuhan dapur harian, pilih satuan eceran atau grosir, lalu pesan untuk diantar atau diambil di toko.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>
    <a className="skip-link" href="#main">Lewati ke konten</a>
    <Providers>
      {children}
    </Providers>
  </body></html>;
}
