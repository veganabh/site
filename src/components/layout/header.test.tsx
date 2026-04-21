import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "./header";

describe("Header", () => {
  it("renderiza a marca como Veg.ana em script", () => {
    render(<Header />);
    expect(screen.getByAltText("Veg.ana")).toBeInTheDocument();
  });

  it("renderiza os 3 links do nav desktop", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /cardápio/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sobre/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /conta/i })).toBeInTheDocument();
  });

  it("renderiza o botão de carrinho com aria-label acessível", () => {
    render(<Header />);
    const cartLink = screen.getByRole("link", { name: /ver carrinho/i });
    expect(cartLink).toBeInTheDocument();
    expect(cartLink).toHaveAttribute("href", "/carrinho");
  });

  it("o link da marca aponta para a home", () => {
    render(<Header />);
    const brandLink = screen.getByRole("link", { name: /veg\.ana — início/i });
    expect(brandLink).toHaveAttribute("href", "/");
  });
});
