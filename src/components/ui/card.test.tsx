import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card, CardBody, CardFooter, CardHeader } from "./card";

describe("Card", () => {
  it("renderiza como div por padrão", () => {
    const { container } = render(<Card>Conteúdo</Card>);
    expect(container.firstChild?.nodeName).toBe("DIV");
  });

  it("renderiza como article quando as='article'", () => {
    const { container } = render(<Card as="article">Produto</Card>);
    expect(container.firstChild?.nodeName).toBe("ARTICLE");
  });

  it("renderiza como section quando as='section'", () => {
    const { container } = render(<Card as="section">Seção</Card>);
    expect(container.firstChild?.nodeName).toBe("SECTION");
  });

  it("aplica classe base rounded-sm border border-divider shadow-sm", () => {
    const { container } = render(<Card>x</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("rounded-sm");
    expect(card).toHaveClass("border-divider");
    expect(card).toHaveClass("shadow-sm");
  });

  it("aplica padding='md' (p-5) por padrão", () => {
    const { container } = render(<Card>x</Card>);
    expect(container.firstChild).toHaveClass("p-5");
  });

  it("aplica padding='none' sem classe de padding", () => {
    const { container } = render(<Card padding="none">x</Card>);
    const card = container.firstChild as HTMLElement;
    // Não deve ter nenhuma das classes de padding
    expect(card).not.toHaveClass("p-3");
    expect(card).not.toHaveClass("p-5");
    expect(card).not.toHaveClass("p-6");
  });

  it("aplica padding='sm' (p-3)", () => {
    const { container } = render(<Card padding="sm">x</Card>);
    expect(container.firstChild).toHaveClass("p-3");
  });

  it("aplica padding='lg' (p-6)", () => {
    const { container } = render(<Card padding="lg">x</Card>);
    expect(container.firstChild).toHaveClass("p-6");
  });

  it("adiciona classe de hover quando interactive=true", () => {
    const { container } = render(<Card interactive>x</Card>);
    expect(container.firstChild).toHaveClass("transition-shadow");
    expect(container.firstChild).toHaveClass("md:hover:shadow-md");
  });

  it("não adiciona classe de hover quando interactive não está presente", () => {
    const { container } = render(<Card>x</Card>);
    expect(container.firstChild).not.toHaveClass("md:hover:shadow-md");
  });

  it("aceita className extra via cn()", () => {
    const { container } = render(<Card className="overflow-hidden">x</Card>);
    expect(container.firstChild).toHaveClass("overflow-hidden");
    expect(container.firstChild).toHaveClass("rounded-sm");
  });

  it("passa atributos extras (aria, data-*)", () => {
    render(
      <Card aria-label="Card de produto" data-testid="card">
        x
      </Card>,
    );
    expect(screen.getByTestId("card")).toHaveAttribute("aria-label", "Card de produto");
  });
});

// ── CardHeader ────────────────────────────────────────────────────────────────

describe("CardHeader", () => {
  it("renderiza com border-b e padding horizontal", () => {
    const { container } = render(<CardHeader>Título</CardHeader>);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass("border-b");
    expect(el).toHaveClass("border-divider");
    expect(el).toHaveClass("px-5");
    expect(el).toHaveClass("py-3");
  });
});

// ── CardBody ──────────────────────────────────────────────────────────────────

describe("CardBody", () => {
  it("renderiza com p-5", () => {
    const { container } = render(<CardBody>Conteúdo</CardBody>);
    expect(container.firstChild).toHaveClass("p-5");
  });
});

// ── CardFooter ────────────────────────────────────────────────────────────────

describe("CardFooter", () => {
  it("renderiza com border-t e flex justify-end", () => {
    const { container } = render(<CardFooter>Ação</CardFooter>);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass("border-t");
    expect(el).toHaveClass("border-divider");
    expect(el).toHaveClass("flex");
    expect(el).toHaveClass("justify-end");
  });
});
