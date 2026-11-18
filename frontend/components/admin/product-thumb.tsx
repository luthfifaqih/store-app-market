"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { demoImages } from "@/lib/demo-images";

export function ProductThumb({ name, url }: { name: string; url: string | null }) {
  const [failed, setFailed] = useState<string>();
  const image = url || demoImages[name];
  return <span className="admin-product-thumb" aria-hidden>
    {image && image !== failed ?
      // eslint-disable-next-line @next/next/no-img-element -- Gambar katalog dapat berasal dari URL unggahan toko.
      <img src={image} alt="" width={42} height={42} loading="lazy" onError={() => setFailed(image)} /> : <Package size={19} />}
  </span>;
}
