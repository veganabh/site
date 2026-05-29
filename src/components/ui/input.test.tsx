import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Input, TextArea } from "./input";

// ── Input ──────────────────────────────────────────────────────────────────────

describe("Input", () => {
  it("renderiza elemento input nativo", () => {
    render(<Input placeholder="Digite aqui" />);
    expect(screen.getByPlaceholderText("Digite aqui")).toBeInTheDocument();
  });

  it("tem classe base h-11 (44px — alvo mínimo WCAG)", () => {
    render(<Input />);
    expect(screen.getByRole("textbox")).toHaveClass("h-11");
  });

  it("aplica border-divider no estado padrão", () => {
    render(<Input />);
    expect(screen.getByRole("textbox")).toHaveClass("border-divider");
  });

  it("aplica border-error quando hasError=true", () => {
    render(<Input hasError aria-label="Campo com erro" />);
    const input = screen.getByRole("textbox", { name: "Campo com erro" });
    expect(input).toHaveClass("border-error");
    expect(input).not.toHaveClass("border-divider");
  });

  it("aceita className extra via cn() sem sobrescrever base", () => {
    render(<Input className="mt-2" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("mt-2");
    expect(input).toHaveClass("rounded-sm");
  });

  it("fica desabilitado com disabled prop", () => {
    render(<Input disabled aria-label="Desabilitado" />);
    expect(screen.getByRole("textbox", { name: "Desabilitado" })).toBeDisabled();
  });

  it("encaminha ref (compatibilidade com RHF register)", () => {
    const ref = { current: null } as React.RefObject<HTMLInputElement | null>;
    render(<Input ref={ref} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe("INPUT");
  });

  it("aceita e exibe valor controlado", async () => {
    const user = userEvent.setup();
    render(<Input defaultValue="" aria-label="Nome" />);
    const input = screen.getByRole("textbox", { name: "Nome" });
    await user.type(input, "Brigadeiro");
    expect(input).toHaveValue("Brigadeiro");
  });

  it("renderiza type=number corretamente", () => {
    render(<Input type="number" aria-label="Preço" />);
    const input = screen.getByRole("spinbutton", { name: "Preço" });
    expect(input).toBeInTheDocument();
  });
});

// ── TextArea ──────────────────────────────────────────────────────────────────

describe("TextArea", () => {
  it("renderiza elemento textarea nativo", () => {
    render(<TextArea placeholder="Descrição" />);
    expect(screen.getByPlaceholderText("Descrição")).toBeInTheDocument();
  });

  it("tem classe min-h-24 (sem h-11 fixo)", () => {
    render(<TextArea aria-label="Texto" />);
    const ta = screen.getByRole("textbox", { name: "Texto" });
    expect(ta).toHaveClass("min-h-24");
    expect(ta).not.toHaveClass("h-11");
  });

  it("aplica border-error quando hasError=true", () => {
    render(<TextArea hasError aria-label="Erro" />);
    expect(screen.getByRole("textbox", { name: "Erro" })).toHaveClass("border-error");
  });

  it("encaminha ref (compatibilidade com RHF register)", () => {
    const ref = { current: null } as React.RefObject<HTMLTextAreaElement | null>;
    render(<TextArea ref={ref} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe("TEXTAREA");
  });

  it("aceita className extra como resize-y", () => {
    render(<TextArea className="resize-y" aria-label="Descrição" />);
    expect(screen.getByRole("textbox", { name: "Descrição" })).toHaveClass("resize-y");
  });
});
