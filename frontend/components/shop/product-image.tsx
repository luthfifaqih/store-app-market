"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import { useState } from "react";
import { demoImages } from "@/lib/demo-images";
import { imageSource } from "@/lib/shop";

export function ProductImage({ name, url, sizes, eager = false, decorative = false }: {
  name: string; url?: string | null; sizes: string; eager?: boolean; decorative?: boolean;
}) {
  const [failed, setFailed] = useState<string>();
  const source = imageSource(url) || demoImages[name];
  const src = source === failed ? demoImages[name] !== failed ? demoImages[name] : undefined : source;
  if (!src) return <span className="shop-image-placeholder" aria-hidden><Package size={34} /></span>;
  return <Image src={src} alt={decorative ? "" : name} fill sizes={sizes} preload={eager}
    unoptimized={!src.startsWith("/")} onError={() => setFailed(src)} />;
}
