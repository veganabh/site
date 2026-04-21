import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductCard } from "./product-card";
import type { Product } from "@/types/product";

const mock: Product = {
  id: "1",
  slug: "bolo-no-pote-brigadeiro",
  name: "Bolo no Pote — Brigadeiro",
  description: "Massa úmida de chocolate com brigadeiro de castanha de caju.",
  category: "bolo-no-pote",
  gramatura_g: 230,
  price_site: 17.9,
  price_ifood: 18.9,
  attributes: ["sem-lactose", "vegano"],
  photo: {
    url: "/images/products/_placeholder.jpg",
    alt: "Bolo no pote de brigadeiro em superfície clara",
  },
  tags: ["favoritos"],
  active: true,
  stock: 10,
  lowStockThreshold: 3,
};

describe("ProductCard", () => {
  it("renderiza nome, descrição e gramatura", () => {
    render(<ProductCard product={mock} />);
    expect(screen.getByText(mock.name)).toBeInTheDocument();
    expect(screen.getByText(mock.description)).toBeInTheDocument();
    expect(screen.getByText("230g")).toBeInTheDocument();
  });

  it("renderiza alt não-vazio na foto", () => {
    render(<ProductCard product={mock} />);
    const img = screen.getByRole("img") as HTMLImageElement;
    expect(img.alt).toBe(mock.photo.alt);
    expect(img.alt.length).toBeGreaterThan(0);
  });

  it("renderiza os atributos como badges (até 2)", () => {
    render(<ProductCard product={mock} />);
    expect(screen.getByText("sem lactose")).toBeInTheDocument();
    expect(screen.getByText("vegano")).toBeInTheDocument();
  });

  it("desabilita o botão Adicionar quando onAdd não é fornecido", () => {
    render(<ProductCard product={mock} />);
    const btn = screen.getByRole("button", { name: /adicionar/i });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/carrinho em breve/i)).toBeInTheDocument();
  });

  it("chama onAdd com o produto quando botão é clicado", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<ProductCard product={mock} onAdd={onAdd} />);
    const btn = screen.getByRole("button", { name: /adicionar/i });
    expect(btn).toBeEnabled();
    await user.click(btn);
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(mock);
  });
});
