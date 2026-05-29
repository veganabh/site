import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

// ── Helper de render ──────────────────────────────────────────────────────────

/**
 * Renderiza um Dialog completo e acessível para cada teste.
 * DialogTitle + DialogDescription são obrigatórios para a11y Radix.
 */
function renderDialog({
  size,
  variant,
  defaultOpen = false,
}: {
  size?: "sm" | "md" | "lg";
  variant?: "modal" | "drawer";
  defaultOpen?: boolean;
} = {}) {
  return render(
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger asChild>
        <button>Abrir</button>
      </DialogTrigger>
      <DialogContent size={size} variant={variant} data-testid="dialog-content">
        <DialogHeader data-testid="dialog-header">
          <DialogTitle>Título do Dialog</DialogTitle>
          <DialogDescription>Descrição acessível do dialog.</DialogDescription>
        </DialogHeader>
        <div>Corpo do dialog.</div>
        <DialogFooter data-testid="dialog-footer">
          <DialogClose asChild>
            <button>Fechar</button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>,
  );
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("Dialog", () => {
  it("não renderiza o conteúdo quando fechado por padrão", () => {
    renderDialog();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("abre o dialog ao clicar no trigger", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("exibe título e descrição acessíveis quando aberto", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    expect(screen.getByText("Título do Dialog")).toBeInTheDocument();
    expect(screen.getByText("Descrição acessível do dialog.")).toBeInTheDocument();
  });

  it("fecha ao pressionar Escape", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("fecha ao clicar no botão DialogClose", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renderiza DialogContent com aria-labelledby apontando para DialogTitle", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const dialog = screen.getByRole("dialog");
    const labelledById = dialog.getAttribute("aria-labelledby");
    expect(labelledById).toBeTruthy();
    const labelEl = document.getElementById(labelledById!);
    expect(labelEl?.textContent).toBe("Título do Dialog");
  });

  it("renderiza defaultOpen=true sem interação", () => {
    renderDialog({ defaultOpen: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

// ── Tamanhos ──────────────────────────────────────────────────────────────────

describe("DialogContent — sizes", () => {
  async function openAndGetContent(size?: "sm" | "md" | "lg") {
    renderDialog({ size, defaultOpen: true });
    return screen.getByTestId("dialog-content");
  }

  it("aplica max-w-lg (md) por padrão", async () => {
    const content = await openAndGetContent();
    expect(content).toHaveClass("max-w-lg");
  });

  it("aplica max-w-sm quando size='sm'", async () => {
    const content = await openAndGetContent("sm");
    expect(content).toHaveClass("max-w-sm");
  });

  it("aplica max-w-2xl quando size='lg'", async () => {
    const content = await openAndGetContent("lg");
    expect(content).toHaveClass("max-w-2xl");
  });
});

// ── Variantes ─────────────────────────────────────────────────────────────────

describe("DialogContent — variants", () => {
  it("modal é centralizado (tem classe translate)", () => {
    renderDialog({ defaultOpen: true });
    const content = screen.getByTestId("dialog-content");
    expect(content).toHaveClass("-translate-x-1/2");
    expect(content).toHaveClass("-translate-y-1/2");
  });

  it("drawer ocupa lado direito sem translate", () => {
    renderDialog({ variant: "drawer", defaultOpen: true });
    const content = screen.getByTestId("dialog-content");
    expect(content).toHaveClass("inset-y-0");
    expect(content).toHaveClass("right-0");
    expect(content).not.toHaveClass("-translate-x-1/2");
  });
});

// ── Subcomponentes estruturais ────────────────────────────────────────────────

describe("DialogHeader", () => {
  it("tem border-b e padding horizontal", () => {
    renderDialog({ defaultOpen: true });
    const header = screen.getByTestId("dialog-header");
    expect(header).toHaveClass("border-b");
    expect(header).toHaveClass("px-6");
    expect(header).toHaveClass("py-4");
  });
});

describe("DialogFooter", () => {
  it("tem border-t e flex justify-end", () => {
    renderDialog({ defaultOpen: true });
    const footer = screen.getByTestId("dialog-footer");
    expect(footer).toHaveClass("border-t");
    expect(footer).toHaveClass("flex");
    expect(footer).toHaveClass("justify-end");
  });
});

describe("DialogTitle", () => {
  it("aplica text-h3 font-bold text-olive-900", () => {
    renderDialog({ defaultOpen: true });
    const title = screen.getByText("Título do Dialog");
    expect(title).toHaveClass("text-h3");
    expect(title).toHaveClass("font-bold");
    expect(title).toHaveClass("text-olive-900");
  });
});

describe("DialogDescription", () => {
  it("aplica text-body-sm text-olive-700", () => {
    renderDialog({ defaultOpen: true });
    const desc = screen.getByText("Descrição acessível do dialog.");
    expect(desc).toHaveClass("text-body-sm");
    expect(desc).toHaveClass("text-olive-700");
  });
});
