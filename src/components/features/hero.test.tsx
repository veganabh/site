import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hero } from "./hero";

describe("Hero", () => {
  it("renderiza o headline editorial", () => {
    render(<Hero />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toMatch(/Doce feito em casa/i);
    expect(heading.textContent).toMatch(/Sem lactose/i);
  });

  it("renderiza o subtítulo com localidade BH", () => {
    render(<Hero />);
    expect(screen.getByText(/Belo Horizonte/i)).toBeInTheDocument();
  });

  it("aplica classes tipográficas do DS (serif italic)", () => {
    render(<Hero />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.className).toContain("font-serif");
    expect(heading.className).toContain("italic");
  });
});
