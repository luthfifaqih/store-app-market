"use client";

import { alert } from "@/lib/alert";
import { MutationCache, QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import type { CartItem } from "@/lib/types";

type CartData = { data: { items: CartItem[] } };
type CartSession = { token: string | null; items: CartItem[]; notice?: string };
type CartChange = { action: "add" | "put"; id: number; quantity: string; item?: CartItem } | { action: "remove"; id: number };
type CartContextValue = CartSession & {
  ready: boolean;
  pending: boolean;
  loadError: Error | null;
  reload: () => void;
  add: (id: number, quantity: string, item?: CartItem, quiet?: boolean | "checkout") => Promise<boolean>;
  put: (id: number, quantity: string) => Promise<boolean>;
  remove: (id: number, quiet?:boolean) => Promise<boolean>;
  clearAfterCheckout: (token: string) => void;
};
const CartContext = createContext<CartContextValue | null>(null);
const cartKey = ["guest-cart"];
const tokenKey = "pasar-sembako-cart-token";
const legacyKey = "pasar-sembako-cart";
const emptyCart: CartSession = { token: null, items: [] };

function readLocal(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* Keranjang tetap tersedia selama tab ini terbuka. */ }
}

function legacyItems(): { product_unit_id: number; quantity: string }[] {
  try {
    const data: unknown = JSON.parse(readLocal(legacyKey) ?? "[]");
    if (!Array.isArray(data)) return [];
    return data.filter((item) => item && Number.isSafeInteger(item.product_unit_id) && item.product_unit_id > 0 && typeof item.quantity === "string").slice(0, 100);
  } catch {
    return [];
  }
}

function keepCartPrices(token: string, items: CartItem[], added?: CartItem) {
  const key = "pasar-sembako-prices-" + token;
  let prior: Record<string, number> = {};
  try { prior = JSON.parse(readLocal(key) ?? "{}") || {}; } catch { /* Abaikan data lokal yang rusak. */ }
  const prices: Record<string, number> = {};
  const lines = items.map((item) => {
    const price = prior[item.product_unit_id] ?? (item.product_unit_id === added?.product_unit_id ? added.unit_price : undefined) ?? item.unit_price;
    if (typeof price !== "number") return item;
    prices[item.product_unit_id] = price;
    return { ...item, baseline_price: price };
  });
  writeLocal(key, Object.keys(prices).length ? JSON.stringify(prices) : null);
  return lines;
}

async function createCart(): Promise<CartSession> {
  const { data, token } = await api<CartData & { token: string }>("/cart", "POST");
  writeLocal(tokenKey, token);
  return { token, items: data.items };
}

async function restoreCart(current: CartSession | undefined): Promise<CartSession> {
  const token = readLocal(tokenKey) ?? current?.token;
  const legacy = legacyItems();
  let cart: CartSession = emptyCart;
  if (token) {
    try {
      const result = await api<CartData>("/cart", "GET", undefined, false, token);
      cart = { token, items: keepCartPrices(token, result.data.items), notice: current?.notice };
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
      writeLocal(tokenKey, null);
      writeLocal("pasar-sembako-prices-" + token, null);
    }
  }
  if (!legacy.length) return cart;
  if (!cart.token) cart = await createCart();
  const importToken = cart.token!;
  let skipped = 0;
  for (const item of legacy) {
    try {
      const result = await api<CartData>(`/cart/items/${item.product_unit_id}`, "PUT", { quantity: item.quantity }, false, importToken);
      cart = { token: importToken, items: result.data.items };
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 422) throw error;
      skipped++;
    }
  }
  writeLocal(legacyKey, null);
  return { ...cart, notice: skipped ? "Sebagian barang dari keranjang lama tidak dapat dipindahkan. Periksa stok dan satuannya di katalog." : undefined };
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ mutationCache: new MutationCache({ onError: (error, _variables, _context, mutation) => { if (!mutation.meta?.quiet) void alert.handleError(error); } }), defaultOptions: { queries: { retry: false, staleTime: 30_000 } } }));
  return <QueryClientProvider client={client}><CartProvider>{children}</CartProvider></QueryClientProvider>;
}

function CartProvider({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const changing = useRef(false);

  const cart = useQuery({
    queryKey: cartKey,
    queryFn: () => restoreCart(cache.getQueryData<CartSession>(cartKey)),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const refetchCart = cart.refetch;
  const reload = useCallback(() => { void refetchCart(); }, [refetchCart]);
  const { mutateAsync, isPending } = useMutation({
    meta: { quiet: true },
    mutationFn: async (change: CartChange) => {
      let session = cache.getQueryData<CartSession>(cartKey) ?? emptyCart;
      if (!session.token && change.action !== "add") return session;
      if (!session.token) {
        session = await createCart();
      }

      const token = session.token!;
      if (change.action === "add") {
        const { data } = await api<CartData>("/cart/items", "POST", { product_unit_id: change.id, quantity: change.quantity }, false, token);
        return { ...session, items: keepCartPrices(token, data.items, change.item) };
      }

      const path = `/cart/items/${change.id}`;
      const result = change.action === "put"
        ? await api<CartData>(path, "PUT", { quantity: change.quantity }, false, token)
        : await api<CartData>(path, "DELETE", undefined, false, token);
      return { ...session, items: keepCartPrices(token, result.data.items) };
    },
    onMutate: (change) => {
      const previous = cache.getQueryData<CartSession>(cartKey) ?? emptyCart;
      const existing = previous.items.find((item) => item.product_unit_id === change.id);
      const item = existing ?? (change.action === "remove" ? undefined : change.item);
      const items = previous.items.filter((line) => line.product_unit_id !== change.id);
      if (item && change.action !== "remove") {
        const quantity = Number(change.quantity) + (change.action === "add" ? Number(existing?.quantity ?? 0) : 0);
        const updated = { ...item, quantity: quantity.toFixed(3) };
        const index = previous.items.findIndex((line) => line.product_unit_id === change.id);
        items.splice(index < 0 ? items.length : index, 0, updated);
      }
      cache.setQueryData<CartSession>(cartKey, { ...previous, items });
      return previous;
    },
    onError: (_error, _change, previous) => {
      if (previous) cache.setQueryData<CartSession>(cartKey, { ...previous, token: readLocal(tokenKey) ?? previous.token });
    },
    onSuccess: (session) => { cache.setQueryData(cartKey, session); },
  });

  async function changeCart(change: CartChange, quiet: boolean | "checkout" = false): Promise<boolean> {
    if (!cart.isSuccess || changing.current) return false;
    changing.current = true;
    try {
      await cache.cancelQueries({ queryKey: cartKey });
      const removed = change.action === "remove" ? cache.getQueryData<CartSession>(cartKey)?.items.find(item => item.product_unit_id === change.id) : undefined;
      await mutateAsync(change);
      if (!quiet && change.action === "add") {
        if(document.querySelector(".shop-panel-quick")) alert.close();
        const page = location.href;
        const open = () => { if (page===location.href) window.dispatchEvent(new CustomEvent("shop-panel",{detail:{type:"cart"}})); };
        alert.toast("success","Ditambahkan ke keranjang",{label:"Lihat",run:open,afterTimer:open});
      }
      if (removed && !quiet) alert.toast("info","Barang dihapus dari keranjang",{label:"Urungkan",run:()=>void changeCart({action:"add",id:removed.product_unit_id,quantity:removed.quantity,item:removed})});
      return true;
    } catch (requestError) {
      if (quiet !== true) void alert.handleError(requestError);
      if (requestError instanceof ApiError && requestError.status === 404) void cart.refetch();
      return false;
    } finally {
      changing.current = false;
    }
  }

  function clearAfterCheckout(token: string) {
    writeLocal("pasar-sembako-prices-" + token, null);
    void cache.cancelQueries({ queryKey: cartKey });
    cache.setQueryData<CartSession>(cartKey, (current) => current?.token === token ? { ...current, items: [] } : current);
    void cache.invalidateQueries({ queryKey: cartKey });
  }

  return <CartContext.Provider value={{
    ...(cart.data ?? emptyCart), ready: cart.isSuccess, pending: isPending,
    loadError: cart.error, reload,
    add: (id, quantity, item, quiet) => changeCart({ action: "add", id, quantity, item }, quiet),
    put: (id, quantity) => changeCart({ action: "put", id, quantity }),
    remove: (id,quiet) => changeCart({ action: "remove", id },quiet),
    clearAfterCheckout,
  }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("Cart provider is required");
  return cart;
}
