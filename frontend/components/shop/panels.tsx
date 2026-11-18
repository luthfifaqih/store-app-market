"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { alert } from "@/lib/alert";
import type { ShopPanel as Panel } from "./panel-events";
import dynamic from "next/dynamic";
const FilterFields = dynamic(() => import("./filters").then((m) => m.FilterFields));
const CartDrawer = dynamic(() => import("./shopping-panels").then((m) => m.CartDrawer));
const QuickView = dynamic(() => import("./shopping-panels").then((m) => m.QuickView));
import { SearchOverlay, StoreMenu } from "./store-menu";

export function ShopPanels() {
  const path = usePathname();
  const [view, setView] = useState<{ panel: Panel; host: HTMLElement }>();
  useEffect(() => {
    let current = 0;
    let mounted = false;
    const open = (event: Event) => {
      const panel = (event as CustomEvent<Panel>).detail;
      const id = ++current;
      mounted = true;
      void alert
        .panel(
          panel.type === "quick"
            ? "Sekilas produk"
            : { cart: "Keranjang Anda", menu: "Menu toko", search: "Cari di toko", filter: "Filter produk" }[
                panel.type
              ],
          panel.type,
          (host) => setView({ panel, host }),
        )
        .then(() => {
          if (id === current) {
            mounted = false;
            setView(undefined);
          }
        });
    };
    window.addEventListener("shop-panel", open);
    return () => {
      window.removeEventListener("shop-panel", open);
      current++;
      if (mounted && document.querySelector(".shop-panel")) alert.close();
    };
  }, [path]);
  if (!view || !view.host.isConnected) return null;
  const { panel, host } = view;
  return createPortal(
    <div
      className="shop shop-panel-body"
      onClick={(e) => {
        if (e.target instanceof Element && e.target.closest("a")) alert.close();
      }}
    >
      {panel.type === "quick" ? (
        <QuickView product={panel.product} />
      ) : panel.type === "cart" ? (
        <CartDrawer />
      ) : panel.type === "search" ? (
        <SearchOverlay />
      ) : panel.type === "filter" ? (
        <FilterFields
          filters={panel.filters}
          categories={panel.categories}
          facets={panel.facets}
          close={alert.close}
        />
      ) : (
        <StoreMenu />
      )}
    </div>,
    host,
  );
}
