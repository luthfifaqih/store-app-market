import Image from "next/image";
import Link from "next/link";
import { Bean, CookingPot, CupSoda, Droplet, Egg, Package, Soup, Wheat } from "lucide-react";
import type { Category } from "@/lib/types";

const icons = [
  { pattern: /beras|tepung/, icon: Wheat },
  { pattern: /minyak/, icon: Droplet },
  { pattern: /telur/, icon: Egg },
  { pattern: /mi instan/, icon: Soup },
  { pattern: /minuman/, icon: CupSoda },
  { pattern: /kacang/, icon: Bean },
  { pattern: /bumbu/, icon: CookingPot },
];

export function CategoryTile({ category, index, count }: { category: Category; index: number; count?:number }) {
  const Icon = icons.find(({ pattern }) => pattern.test(category.name.toLowerCase()))?.icon ?? Package;
  const photo = [/beras|tepung/i,/bumbu|bawang/i,/kering|mi instan/i,/minyak/i,/telur/i,/gula/i].findIndex(pattern=>pattern.test(category.name));
  return <Link prefetch={false} href={"/produk?kategori=" + category.id} className="shop-category-tile" data-color={index % 6}>
    <span>{photo>=0?<Image src={"/products/"+["rice","shallots","noodles","oil","eggs","sugar"][photo]+".webp"} width={68} height={68} alt=""/>:<Icon size={23} strokeWidth={1.8} aria-hidden />}</span><strong>{category.name}</strong>{count!==undefined&&<small>{count} produk</small>}
  </Link>;
}
