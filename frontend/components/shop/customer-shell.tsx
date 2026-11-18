import type { ReactNode } from "react";
import { headingFont,bodyFont } from "./font";
import { ShopPanels } from "./panels";
import { BottomNav, Header } from "./navigation";
import { ShopSupport } from "./support";

export function CustomerShell({ children }: { children: ReactNode }) {
  return <div className={"shop "+headingFont.variable+" "+bodyFont.variable}>
    <Header />
    <main id="main" className="shop-main">{children}</main>
    <ShopSupport />
    <BottomNav /><ShopPanels />
  </div>;
}
