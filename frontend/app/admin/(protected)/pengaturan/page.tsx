import { AdminHeading } from "@/components/admin/admin-frame";
import { AdminSettings } from "@/components/admin/settings";

export const metadata = { title: "Pengaturan toko" };

export default function Page() {
  return <><AdminHeading title="Pengaturan toko">Kelola kontak toko, rekening transfer, dan batas stok menipis.</AdminHeading><AdminSettings /></>;
}
