"use client";

import { alert } from "@/lib/alert";

import { Search, X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
export { EmptyState, PillSelect, PillTabs, SkeletonCard, StatusBadge } from "@/components/ui-shared/primitives";

export const activeOptions = [{ value: "", label: "Semua status" }, { value: "active", label: "Aktif" }, { value: "inactive", label: "Nonaktif" }] as const;



export function PageHeader({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return <header className="admin-page-header"><div><h1>{title}</h1>{children && <p>{children}</p>}</div>{actions}</header>;
}



export function DataTable({ label, headings, children }: { label: string; headings: string[]; children: ReactNode }) {
  return <div className="table-scroll" tabIndex={0} role="region" aria-label={label}>
    <table className="data-table"><thead><tr>{headings.map((heading) => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
      <tbody>{children}</tbody>
    </table>
  </div>;
}

export function ListItemCard({ leading, title, subtitle, trailing }: { leading?: ReactNode; title: ReactNode; subtitle: ReactNode; trailing: ReactNode }) {
  return <li className="admin-list-item">
    {leading}
    <div className="admin-list-copy"><strong>{title}</strong><span>{subtitle}</span></div>
    <div className="admin-list-end">{trailing}</div>
  </li>;
}



export function SearchField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="admin-search">
    <Search size={16} aria-hidden /><input type="search" maxLength={100} value={value} aria-label={label} placeholder={label + "…"} onChange={(event) => onChange(event.target.value)} />
  </label>;
}

export function EditorDialog({ title, wide, onClose, children, returnFocus }: {
  title: string; wide?: boolean; onClose: () => void; children: ReactNode; returnFocus?: React.RefObject<HTMLElement | null>;
}) {
  const opener = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  async function requestClose() {
    if (panel.current?.querySelector("[data-unsaved]") && !await alert.confirm({title:"Tinggalkan perubahan?",text:"Isian yang belum disimpan akan hilang.",danger:true})) return;
    onClose();
  }
  return <Dialog.Root open onOpenChange={(open) => { if (!open) void requestClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="admin-overlay" />
      <Dialog.Content ref={panel} onClickCapture={(event) => { if (event.target instanceof Element && event.target.closest("[data-close-editor]")) { event.stopPropagation(); void requestClose(); } }} className="admin-dialog" data-wide={wide || undefined} aria-describedby={undefined}
        onOpenAutoFocus={() => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
        onCloseAutoFocus={(event) => {
          const target = returnFocus?.current ?? opener.current;
          if (!target?.isConnected) return;
          event.preventDefault();
          target.focus();
        }}>
        <Dialog.Title className="admin-dialog-title">{title}</Dialog.Title>
        <Dialog.Close className="admin-icon-button admin-dialog-close" aria-label="Tutup dialog"><X size={19} aria-hidden /></Dialog.Close>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
