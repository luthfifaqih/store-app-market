"use client";

import { alert } from "@/lib/alert";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [result, setResult] = useState<"idle" | "done" | "failed">("idle");
  return <span className="shop-copy-action">
    <Button variant="outline" aria-label={label} onClick={async () => {
      try { await navigator.clipboard.writeText(value); setResult("done"); alert.toast("success","Berhasil disalin"); }
      catch { setResult("failed"); void alert.warning("Gagal menyalin","Salin teks secara manual."); }
    }}>{result === "done" ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} {result === "done" ? "Tersalin" : "Salin"}</Button>
  </span>;
}
