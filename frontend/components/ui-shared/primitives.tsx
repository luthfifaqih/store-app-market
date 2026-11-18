"use client";

import { ChevronDown, PackageOpen } from "lucide-react";
import type { ReactNode } from "react";
import { paymentName, statusName } from "@/lib/api";
import type { OrderStatus } from "@/lib/types";

type Option<T extends string> = { value: T; label: string };

export function PillSelect<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: readonly Option<T>[]; onChange: (value: T) => void;
}) {
  return <label className="ui-pill-select admin-pill-select">
    <select aria-label={label} value={value} onChange={(event) => {
      const option = options.find((item) => item.value === event.target.value);
      if (option) onChange(option.value);
    }}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
    <ChevronDown size={14} aria-hidden />
  </label>;
}

export function PillTabs<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: readonly Option<T>[]; onChange: (value: T) => void;
}) {
  return <div role="group" aria-label={label} className="ui-pill-tabs admin-pill-tabs">
    {options.map((option) => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>;
}

const statusTones: Record<string, string> = {
  pending: "yellow", dikonfirmasi: "blue", diproses: "purple", dikirim: "blue", selesai: "green", dibatalkan: "pink",
  menunggu: "yellow", ditinjau: "yellow", terverifikasi: "green", ditolak: "pink", "aktif": "green", "nonaktif": "pink",
};

export function StatusBadge({ status, children }: { status: string; children?: ReactNode }) {
  return <span className="ui-status admin-status" data-tone={statusTones[status]}>{children ?? statusName[status as OrderStatus] ?? paymentName[status as keyof typeof paymentName] ?? status}</span>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="ui-empty admin-empty"><PackageOpen size={22} aria-hidden /><p>{children}</p></div>;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return <div className="ui-skeleton admin-panel admin-skeleton" role="status" aria-label="Memuat data">
    {Array.from({ length: lines }, (_, index) => <span key={index} aria-hidden />)}
  </div>;
}
