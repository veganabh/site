import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockPathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

// Cart store mock — sem itens por padrão
vi.mock("@/stores/cart-store", () => ({
  useCartStore: (selector: (s: { items: [] }) => unknown) => selector({ items: [] }),
}));

// Sidebar store mock — colapsado por padrão (mostra labels não importa pro teste)
vi.mock("@/stores/sidebar-store", () => ({
  useSidebarStore: (
    selector: (s: { publicExpanded: boolean; togglePublic: () => void }) => unknown,
  ) => selector({ publicExpanded: true, togglePublic: () => {} }),
}));

// Session mock controlável por teste (role admin vs customer vs anônimo).
const mockSession = vi.fn();
vi.mock("@/lib/auth/use-session", () => ({
  useSession: () => mockSession(),
}));

import { Sidebar } from "./sidebar";

describe("Sidebar", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/");
    mockSession.mockReturnValue({ isAuthed: true, user: { role: "admin" } });
  });

  it("mostra o atalho Gestão para admin", () => {
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /gestão/i })).toBeInTheDocument();
  });

  it("marca Gestão como ativo quando pathname começa com /gestao", () => {
    mockPathname.mockReturnValue("/gestao");
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /gestão/i })).toHaveAttribute("aria-current", "page");
  });

  it("Gestão não fica ativo na home", () => {
    mockPathname.mockReturnValue("/");
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /gestão/i })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("admin vê o separator da área interna", () => {
    render(<Sidebar />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("NÃO mostra Gestão nem Configurações para cliente comum (role=customer)", () => {
    mockSession.mockReturnValue({ isAuthed: true, user: { role: "customer" } });
    render(<Sidebar />);
    expect(screen.queryByRole("link", { name: /gestão/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /configurações/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  it("NÃO mostra Gestão para visitante anônimo", () => {
    mockSession.mockReturnValue({ isAuthed: false, user: null });
    render(<Sidebar />);
    expect(screen.queryByRole("link", { name: /gestão/i })).not.toBeInTheDocument();
  });
});
