import type { ReactNode } from "react";
import { CustomerShell } from "@/components/shop/customer-shell";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return <CustomerShell>{children}</CustomerShell>;
}
