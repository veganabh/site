import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceDisplay } from "./price-display";

describe("PriceDisplay", () => {
  it("renderiza preço do site e riscado do iFood quando há economia", () => {
    render(<PriceDisplay priceSite={17.9} priceIfood={18.9} />);
    expect(screen.getByText(/17,90/)).toBeInTheDocument();
    expect(screen.getByText(/no iFood/i)).toBeInTheDocument();
    expect(screen.getByText(/18,90/)).toBeInTheDocument();
  });

  it("não renderiza preço iFood quando é igual ao site", () => {
    render(<PriceDisplay priceSite={11.9} priceIfood={11.9} />);
    expect(screen.getByText(/11,90/)).toBeInTheDocument();
    expect(screen.queryByText(/no iFood/i)).not.toBeInTheDocument();
  });

  it("não renderiza preço iFood quando iFood está mais barato", () => {
    render(<PriceDisplay priceSite={10} priceIfood={8} />);
    expect(screen.queryByText(/no iFood/i)).not.toBeInTheDocument();
  });

  it("renderiza selo de economia quando showSavingsLabel é true e há economia", () => {
    render(<PriceDisplay priceSite={17.9} priceIfood={18.9} showSavingsLabel />);
    expect(screen.getByText(/você economiza/i)).toBeInTheDocument();
  });

  it("não renderiza selo de economia quando não há economia, mesmo com showSavingsLabel", () => {
    render(<PriceDisplay priceSite={11.9} priceIfood={11.9} showSavingsLabel />);
    expect(screen.queryByText(/você economiza/i)).not.toBeInTheDocument();
  });
});
