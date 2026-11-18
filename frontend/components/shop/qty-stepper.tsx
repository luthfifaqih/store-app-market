"use client";

import { alert } from "@/lib/alert";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { amountString, quantityText } from "@/lib/shop";
import { quantitySchema } from "@/lib/customer";

export function QtyStepper({ label, quantity, onChange, min = 1, max = 99999, fractional = false, editable = true, disabled = false }: {
  label: string; quantity: number; onChange: (quantity: number) => void;
  min?: number; max?: number; fractional?: boolean; editable?: boolean; disabled?: boolean;
}) {
  const [draft, setDraft] = useState<string>();
  const delta = fractional ? 0.5 : 1;
  function set(value: number) { setDraft(undefined); onChange(Number(amountString(Math.max(min, Math.min(max, value))))); }
  function commit() {
    if (draft === undefined) return;
    if (min === 0 && /^0(?:[.,]0+)?$/.test(draft.trim())) { set(0); return; }
    const parsed = quantitySchema.safeParse(draft);
    if (parsed.success && Number(parsed.data) >= min && Number(parsed.data) <= max && (fractional || Number.isInteger(Number(parsed.data)))) set(Number(parsed.data));
    else { setDraft(undefined); void alert.warning("Periksa jumlah", "Gunakan " + (fractional ? "jumlah" : "bilangan bulat") + " antara " + quantityText(min) + " dan " + quantityText(max) + "."); }
  }
  return <div className="shop-stepper" role="group" aria-label={"Jumlah " + label}>
    <button type="button" className="shop-icon" aria-label={"Kurangi " + label} disabled={disabled || quantity <= min} onClick={() => set(quantity - delta)}><Minus size={16} aria-hidden /></button>
    {editable ? <input aria-label={"Jumlah " + label} inputMode={fractional ? "decimal" : "numeric"} maxLength={9} disabled={disabled} value={draft ?? quantityText(quantity).replaceAll(".", "")}
      onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => {
        if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
        if (event.key === "Escape") setDraft(undefined);
      }} />
      : <output aria-label={"Jumlah " + label}>{quantityText(quantity)}</output>}
    <button type="button" className="shop-icon" aria-label={"Tambah " + label} disabled={disabled || quantity >= max} onClick={() => set(quantity + delta)}><Plus size={16} aria-hidden /></button>
  </div>;
}
