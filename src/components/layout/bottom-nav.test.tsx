import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockPathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

// Importar depois do mock
import { BottomNav } from "./bottom-nav";

describe("BottomNav", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/");
  });

  it("renderiza 3 itens de navegação", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /carrinho/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /conta/i })).toBeInTheDocument();
  });

  it("marca Home como ativo quando pathname é /", () => {
    mockPathname.mockReturnValue("/");
    render(<BottomNav />);
    const homeLink = screen.getByRole("link", { name: /home/i });
    expect(homeLink).toHaveAttribute("aria-current", "page");
  });

  it("marca Carrinho como ativo em /carrinho", () => {
    mockPathname.mockReturnValue("/carrinho");
    render(<BottomNav />);
    const cart = screen.getByRole("link", { name: /carrinho/i });
    expect(cart).toHaveAttribute("aria-current", "page");
  });

  it("marca Conta como ativo em /conta", () => {
    mockPathname.mockReturnValue("/conta");
    render(<BottomNav />);
    const conta = screen.getByRole("link", { name: /conta/i });
    expect(conta).toHaveAttribute("aria-current", "page");
  });

  it("nenhum item fica ativo em rota sem match", () => {
    mockPathname.mockReturnValue("/algo-inesperado");
    render(<BottomNav />);
    const links = screen.getAllByRole("link");
    for (const link of links) {
      expect(link).not.toHaveAttribute("aria-current", "page");
    }
  });
});
