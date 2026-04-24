"use client";

/**
 * sidebar-store.ts — estado persistente de expand/collapse das sidebars.
 *
 * Dois namespaces independentes:
 * - `publicExpanded`: rail da área pública (default: false → w-16 só ícones)
 * - `adminExpanded`: sidebar admin (default: true → w-60 com labels)
 *
 * Persiste em localStorage (`vegana.sidebar-v1`).
 * Usado por `dashboard/sidebar.tsx` + `dashboard-shell.tsx` (público)
 *          e por `admin/admin-sidebar.tsx` + `admin-shell.tsx` (admin).
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type SidebarState = {
  publicExpanded: boolean;
  adminExpanded: boolean;
};

type SidebarActions = {
  togglePublic: () => void;
  toggleAdmin: () => void;
  setPublicExpanded: (v: boolean) => void;
  setAdminExpanded: (v: boolean) => void;
};

export const useSidebarStore = create<SidebarState & SidebarActions>()(
  persist(
    (set) => ({
      publicExpanded: false,
      adminExpanded: true,

      togglePublic: () => set((s) => ({ publicExpanded: !s.publicExpanded })),
      toggleAdmin: () => set((s) => ({ adminExpanded: !s.adminExpanded })),
      setPublicExpanded: (v) => set({ publicExpanded: v }),
      setAdminExpanded: (v) => set({ adminExpanded: v }),
    }),
    {
      name: "vegana.sidebar-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
