"use client";

import { create } from "zustand";
import type { Product } from "@/types/product";

type MenuStore = {
  products: Product[];

  /** Adiciona um produto novo ao cardápio. */
  addProduct: (product: Product) => void;

  /** Atualiza campos de um produto existente pelo id. */
  updateProduct: (id: string, changes: Partial<Omit<Product, "id">>) => void;

  /** Alterna o estado ativo/inativo de um produto. */
  toggleActive: (id: string) => void;

  /** Remove um produto do cardápio. */
  deleteProduct: (id: string) => void;

  /**
   * Ajusta o estoque de um produto por delta positivo ou negativo.
   * Não permite que o estoque fique abaixo de 0.
   */
  adjustStock: (id: string, delta: number) => void;

  /** Define o estoque de um produto como valor exato (mínimo 0). */
  setStock: (id: string, value: number) => void;

  /** Retorna os produtos cujo stock <= lowStockThreshold (inclui esgotados). */
  getLowStockProducts: () => Product[];
};

export const useMenuStore = create<MenuStore>((set, get) => ({
  products: [],

  addProduct: (product) => set((state) => ({ products: [...state.products, product] })),

  updateProduct: (id, changes) =>
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? { ...p, ...changes } : p)),
    })),

  toggleActive: (id) =>
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
    })),

  deleteProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    })),

  adjustStock: (id, delta) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p,
      ),
    })),

  setStock: (id, value) =>
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? { ...p, stock: Math.max(0, value) } : p)),
    })),

  getLowStockProducts: () => get().products.filter((p) => p.stock <= p.lowStockThreshold),
}));
