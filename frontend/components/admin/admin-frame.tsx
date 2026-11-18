"use client";

import { alert } from "@/lib/alert";

import { useActionMutation } from "@/lib/alert/hooks";

import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Staff } from "@/lib/admin";
import { api } from "@/lib/api";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ staff, children }: { staff: Staff; children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const cache = useQueryClient();
  const logout = useActionMutation({ loadingTitle: "Keluar dari panel…", successTitle: "Berhasil keluar", successMode: "none" }, {
    mutationFn: () => api<void>("/admin/logout", "POST", undefined, true),
    onSuccess: () => { cache.removeQueries({ queryKey: ["admin"] }); window.location.replace("/admin/login"); },
  });
  const sidebar = { onLogout: async () => { setDrawer(false); if (await alert.confirm({title:"Keluar dari panel admin?"})) logout.mutate(); }, busy: logout.isPending || logout.isSuccess };

  return <div className="admin-stage">
    <div className="admin-frame">
      <aside className="admin-sidebar"><Sidebar {...sidebar} /></aside>
      <div className="admin-workspace">
        <Dialog.Root open={drawer} onOpenChange={setDrawer}>
          <Topbar staff={staff} menuTrigger={<Dialog.Trigger className="admin-icon-button admin-menu-trigger" aria-label="Buka menu admin"><Menu size={22} aria-hidden /></Dialog.Trigger>} />
          <Dialog.Portal>
            <Dialog.Overlay className="admin-overlay" />
            <Dialog.Content className="admin-drawer" aria-describedby={undefined}>
              <Dialog.Title className="sr-only">Menu admin</Dialog.Title>
              <Dialog.Close className="admin-icon-button admin-dialog-close" aria-label="Tutup menu"><X size={20} aria-hidden /></Dialog.Close>
              <Sidebar {...sidebar} onNavigate={() => setDrawer(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        <div className="admin-main" id="admin-content">
          
          {children}
        </div>
      </div>
    </div>
  </div>;
}

export { PageHeader as AdminHeading } from "./primitives";
