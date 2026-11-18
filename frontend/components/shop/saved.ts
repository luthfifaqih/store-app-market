"use client";
import { useSyncExternalStore } from "react";
import { alert } from "@/lib/alert";
const key = "sembako-wishlist";
function subscribe(fn: () => void) {
  window.addEventListener("storage", fn);
  window.addEventListener(key, fn);
  return () => {
    window.removeEventListener("storage", fn);
    window.removeEventListener(key, fn);
  };
}
function snapshot() {
  try {
    return localStorage.getItem(key) || "[]";
  } catch {
    return "[]";
  }
}
function parse(raw: string): number[] {
  try {
    const ids = JSON.parse(raw);
    return Array.isArray(ids) ? ids.filter((id) => Number.isSafeInteger(id) && id > 0) : [];
  } catch {
    return [];
  }
}
export function useSaved() {
  return parse(useSyncExternalStore(subscribe, snapshot, () => "[]"));
}
export function toggleSaved(id: number, quiet = false) {
  const ids = parse(snapshot()),
    added = !ids.includes(id);
  try {
    localStorage.setItem(key, JSON.stringify(added ? [...ids, id] : ids.filter((value) => value !== id)));
    window.dispatchEvent(new Event(key));
    if (!quiet) alert.toast("success", added ? "Disimpan di wishlist" : "Dihapus dari wishlist");
  } catch {
    void alert.warning("Wishlist belum tersimpan", "Penyimpanan browser tidak tersedia.");
  }
}
