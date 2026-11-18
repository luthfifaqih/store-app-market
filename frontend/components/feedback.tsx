import type { ReactNode } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";

export function Loading({ label = "Memuat data…" }: { label?: string }) {
  return <p className="feedback" role="status"><LoaderCircle size={18} className="animate-spin" aria-hidden />{label}</p>;
}

export function Failure({ error, retry }: { error: unknown; retry?: () => void }) {
  const message = error instanceof ApiError
    ? Object.values(error.fields).flat().join(" ") || error.message
    : "Koneksi ke toko gagal. Coba lagi.";
  return <div className="feedback failure" role="alert"><CircleAlert size={19} className="shrink-0" aria-hidden /><span>{message}</span>{retry && <Button variant="outline" onClick={retry}>Coba lagi</Button>}</div>;
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{error && <span className="text-sm text-red-800" role="alert">{error}</span>}</label>;
}

export function Pagination({ page, last, onPage }: { page: number; last: number; onPage: (page: number) => void }) {
  if (last <= 1) return null;
  return <nav aria-label="Halaman hasil" className="mt-5 flex flex-wrap items-center justify-center gap-3">
    <Button variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Sebelumnya</Button>
    <span className="text-sm">Halaman {page} / {last}</span>
    <Button variant="outline" disabled={page >= last} onClick={() => onPage(page + 1)}>Berikutnya</Button>
  </nav>;
}
