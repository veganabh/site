import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryChips } from "./category-chips";

describe("CategoryChips", () => {
  it("renderiza 'Todos' + 3 categorias visíveis", () => {
    render(<CategoryChips basePath="/" />);
    expect(screen.getByRole("link", { name: /^todos$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /bolos no pote/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^bolos$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /docinhos/i })).toBeInTheDocument();
  });

  it("chip 'Todos' aponta para basePath sem query", () => {
    render(<CategoryChips basePath="/" />);
    const todos = screen.getByRole("link", { name: /^todos$/i });
    expect(todos).toHaveAttribute("href", "/");
  });

  it("chip de categoria aponta para basePath com ?cat=slug", () => {
    render(<CategoryChips basePath="/" />);
    const bolosPote = screen.getByRole("link", { name: /bolos no pote/i });
    expect(bolosPote).toHaveAttribute("href", "/?cat=bolo-no-pote");
  });

  it("marca chip ativa com aria-current", () => {
    render(<CategoryChips basePath="/" active="docinho" />);
    const docinho = screen.getByRole("link", { name: /docinhos/i });
    expect(docinho).toHaveAttribute("aria-current", "page");
  });

  it("marca 'Todos' como ativo quando active=all (padrão)", () => {
    render(<CategoryChips basePath="/" />);
    const todos = screen.getByRole("link", { name: /^todos$/i });
    expect(todos).toHaveAttribute("aria-current", "page");
  });
});
