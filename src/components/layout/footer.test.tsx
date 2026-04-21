import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "./footer";

describe("Footer", () => {
  it("renderiza os 4 links institucionais", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /sobre/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /contato/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /termos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /privacidade/i })).toBeInTheDocument();
  });

  it("renderiza link para Instagram com target _blank", () => {
    render(<Footer />);
    const ig = screen.getByRole("link", { name: /instagram/i });
    expect(ig).toHaveAttribute("target", "_blank");
    expect(ig).toHaveAttribute("href", expect.stringContaining("instagram.com"));
  });

  it("renderiza link para WhatsApp com wa.me", () => {
    render(<Footer />);
    const wa = screen.getByRole("link", { name: /whatsapp/i });
    expect(wa).toHaveAttribute("href", expect.stringContaining("wa.me"));
  });

  it("renderiza copyright com ano corrente", () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(`©\\s*${year}\\s*Veg\\.ana`))).toBeInTheDocument();
  });
});
