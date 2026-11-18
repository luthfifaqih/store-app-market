"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
const subscribe = (callback: () => void) => {
  const timer = setInterval(callback, 1000);
  return () => clearInterval(timer);
};
export function CountdownBanner({ ends }: { ends: string }) {
  const now = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 1000),
    () => 0,
  );
  const remaining = Math.floor(Date.parse(ends) / 1000) - now;
  if (!now || !Number.isFinite(remaining) || remaining <= 0) return null;
  return (
    <section className="daily-offer">
      <p>~ Periode penawaran toko ~</p>
      <h2>Penawaran hari ini</h2>
      <div role="timer" aria-live="off">
        {[
          ["Hari", Math.floor(remaining / 86400)],
          ["Jam", Math.floor(remaining / 3600) % 24],
          ["Menit", Math.floor(remaining / 60) % 60],
          ["Detik", remaining % 60],
        ].map(([label, v]) => (
          <span key={label}>
            <b>{String(v).padStart(2, "0")}</b>
            {label}
          </span>
        ))}
      </div>
      <Link href="/produk">Lihat produk →</Link>
      <div className="brush-edge" aria-hidden />
    </section>
  );
}
