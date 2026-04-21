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

import { Sidebar } from "./sidebar";

describe("Sidebar", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/");
  });

  it("lista o item Gestão no sidebar", () => {
    render(<Sidebar />);
    expect(
      screen.getByRole("link", { name: /gestão/i }),
    ).toBeInTheDocument();
  });

  it("marca Gestão como ativo quando pathname começa com /gestao", () => {
    mockPathname.mockReturnValue("/gestao");
    render(<Sidebar />);
    const gestaoLink = screen.getByRole("link", { name: /gestão/i });
    expect(gestaoLink).toHaveAttribute("aria-current", "page");
  });

  it("Gestão não fica ativo na home", () => {
    mockPathname.mockReturnValue("/");
    render(<Sidebar />);
    const gestaoLink = screen.getByRole("link", { name: /gestão/i });
    expect(gestaoLink).not.toHaveAttribute("aria-current", "page");
  });

  it("separa área interna com um separator", () => {
    render(<Sidebar />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });
});
