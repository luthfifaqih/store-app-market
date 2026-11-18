"use client";

import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminUnavailable() {
  const router = useRouter();
  return <div className="feedback failure" role="alert">
    <CircleAlert size={19} className="shrink-0" aria-hidden />
    <span>Panel admin belum dapat terhubung ke server toko.</span>
    <Button variant="outline" onClick={() => router.refresh()}>Coba lagi</Button>
  </div>;
}
