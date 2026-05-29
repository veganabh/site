import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renderiza com texto e variant primary por padrão", () => {
    render(<Button>Comprar</Button>);
    const btn = screen.getByRole("button", { name: "Comprar" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass("bg-olive-900");
  });

  it("aplica variant secondary corretamente", () => {
    render(<Button variant="secondary">Cancelar</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-paper-100");
  });

  it("aplica variant ghost corretamente", () => {
    render(<Button variant="ghost">Voltar</Button>);
    expect(screen.getByRole("button")).toHaveClass("text-olive-900");
    expect(screen.getByRole("button")).not.toHaveClass("bg-olive-900");
  });

  it("aplica variant danger corretamente", () => {
    render(<Button variant="danger">Excluir</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-error");
  });

  it("aplica size sm (h-9)", () => {
    render(<Button size="sm">Ação</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-9");
  });

  it("aplica size md por padrão (h-11 — 44px, alvo mínimo WCAG)", () => {
    render(<Button>Ação</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-11");
  });

  it("aplica size lg (h-12)", () => {
    render(<Button size="lg">Ação</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-12");
  });

  it("exibe spinner e desabilita quando isLoading=true", () => {
    render(<Button isLoading>Salvando...</Button>);
    const btn = screen.getByRole("button");
    // aria-busy sinaliza estado de carregamento para assistive tech
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).toBeDisabled();
    // Loader2 renderiza como SVG — verifica por aria-hidden
    const spinner = btn.querySelector("[aria-hidden='true']");
    expect(spinner).toBeInTheDocument();
  });

  it("permanece desabilitado quando disabled=true (sem isLoading)", () => {
    render(<Button disabled>Ação</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("não tem aria-busy quando não está carregando", () => {
    render(<Button>Ação</Button>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy");
  });

  it("chama onClick quando clicado e não está desabilitado", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Clique</Button>);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("não chama onClick quando está desabilitado", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Desabilitado
      </Button>,
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("aceita className extra sem sobrescrever base", () => {
    render(<Button className="mt-4">Ação</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("mt-4");
    expect(btn).toHaveClass("inline-flex");
  });

  it("asChild renderiza filho como elemento raiz", () => {
    render(
      <Button asChild>
        <a href="/cardapio">Ver cardápio</a>
      </Button>,
    );
    // Com asChild, deve haver <a> em vez de <button>
    expect(screen.getByRole("link", { name: "Ver cardápio" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
