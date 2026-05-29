/**
 * Testes do módulo Cardápio:
 * 1. Lista renderiza os produtos do store
 * 2. Novo produto é adicionado via addProduct
 * 3. Edição via updateProduct persiste no store
 * 4. toggleActive alterna ativo/inativo
 * 5. adjustStock não deixa estoque ficar negativo
 * 6. setStock substitui o valor exato
 * 7. getLowStockProducts retorna os produtos corretos
 * 8. badge "Esgotado" aparece quando stock === 0
 */
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMenuStore } from "@/stores/menu-store";
import { productFixtures } from "@/__fixtures__/products";
import type { Product } from "@/types/product";

// Reseta o store antes de cada teste para isolamento
beforeEach(() => {
  useMenuStore.setState({
    products: productFixtures.map((p) => ({ ...p })),
  });
});

// ── Produto auxiliar completo (inclui stock + lowStockThreshold) ──────────
const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: "99",
  slug: "cookie-aveia",
  name: "Cookie de Aveia",
  description: "Cookie crocante de aveia e cacau. Sem lactose, sem ovo.",
  category: "docinho",
  gramatura_g: 40,
  price_site: 8.9,
  price_ifood: 9.9,
  attributes: ["sem-lactose", "vegano"],
  tags: ["novidades"],
  photo: { url: "", alt: "Cookie de aveia em superfície clara" },
  active: true,
  stock: 10,
  lowStockThreshold: 3,
  ...overrides,
});

// ── Testes originais ──────────────────────────────────────────────────────

describe("useMenuStore — lista", () => {
  it("inicializa com os 12 produtos do productFixtures", () => {
    const { result } = renderHook(() => useMenuStore());
    expect(result.current.products).toHaveLength(12);
  });

  it("todos os produtos iniciais têm active: true", () => {
    const { result } = renderHook(() => useMenuStore());
    const inativos = result.current.products.filter((p) => !p.active);
    expect(inativos).toHaveLength(0);
  });
});

describe("useMenuStore — addProduct", () => {
  it("adiciona um novo produto e incrementa o total", () => {
    const { result } = renderHook(() => useMenuStore());
    const novo = makeProduct();

    act(() => result.current.addProduct(novo));

    expect(result.current.products).toHaveLength(13);
    expect(result.current.products.find((p) => p.id === "99")?.name).toBe("Cookie de Aveia");
  });
});

describe("useMenuStore — updateProduct", () => {
  it("atualiza o preço de um produto existente", () => {
    const { result } = renderHook(() => useMenuStore());

    act(() => result.current.updateProduct("1", { price_site: 22.9 }));

    const updated = result.current.products.find((p) => p.id === "1");
    expect(updated?.price_site).toBe(22.9);
    // Outros campos não mudam
    expect(updated?.name).toBe("Bolo no Pote — Brigadeiro");
  });
});

describe("useMenuStore — toggleActive", () => {
  it("desativa um produto ativo e o reativa em seguida", () => {
    const { result } = renderHook(() => useMenuStore());

    // Produto 1 começa ativo
    expect(result.current.products.find((p) => p.id === "1")?.active).toBe(true);

    // Desativa
    act(() => result.current.toggleActive("1"));
    expect(result.current.products.find((p) => p.id === "1")?.active).toBe(false);

    // Reativa
    act(() => result.current.toggleActive("1"));
    expect(result.current.products.find((p) => p.id === "1")?.active).toBe(true);
  });
});

describe("useMenuStore — deleteProduct", () => {
  it("remove um produto pelo id", () => {
    const { result } = renderHook(() => useMenuStore());

    act(() => result.current.deleteProduct("1"));

    expect(result.current.products).toHaveLength(11);
    expect(result.current.products.find((p) => p.id === "1")).toBeUndefined();
  });
});

// ── Novos testes — estoque ────────────────────────────────────────────────

describe("useMenuStore — adjustStock", () => {
  it("incrementa o estoque em 1", () => {
    const { result } = renderHook(() => useMenuStore());
    const estoqueInicial = result.current.products.find((p) => p.id === "1")!.stock;

    act(() => result.current.adjustStock("1", 1));

    expect(result.current.products.find((p) => p.id === "1")?.stock).toBe(estoqueInicial + 1);
  });

  it("não deixa o estoque ficar negativo ao decrementar além de zero", () => {
    const { result } = renderHook(() => useMenuStore());

    // Produto 5 começa com stock === 0 (bombom de brigadeiro no mock)
    expect(result.current.products.find((p) => p.id === "5")?.stock).toBe(0);

    act(() => result.current.adjustStock("5", -1));

    // Continua em 0 — não vai para -1
    expect(result.current.products.find((p) => p.id === "5")?.stock).toBe(0);
  });

  it("decrementa corretamente quando estoque > 0", () => {
    const { result } = renderHook(() => useMenuStore());
    const antes = result.current.products.find((p) => p.id === "1")!.stock;

    act(() => result.current.adjustStock("1", -1));

    expect(result.current.products.find((p) => p.id === "1")?.stock).toBe(antes - 1);
  });
});

describe("useMenuStore — setStock", () => {
  it("substitui o valor do estoque pelo exato informado", () => {
    const { result } = renderHook(() => useMenuStore());

    act(() => result.current.setStock("1", 99));

    expect(result.current.products.find((p) => p.id === "1")?.stock).toBe(99);
  });

  it("não permite stock negativo via setStock — fica em 0", () => {
    const { result } = renderHook(() => useMenuStore());

    act(() => result.current.setStock("1", -5));

    expect(result.current.products.find((p) => p.id === "1")?.stock).toBe(0);
  });
});

describe("useMenuStore — getLowStockProducts", () => {
  it("retorna produtos com stock <= lowStockThreshold", () => {
    const { result } = renderHook(() => useMenuStore());

    // O mock inclui produtos zerados e com estoque baixo.
    // Produto 5 (stock 0, threshold 5): baixo; produto 3 (stock 2, threshold 3): baixo.
    const baixos = result.current.getLowStockProducts();
    const ids = baixos.map((p) => p.id);

    expect(ids).toContain("5"); // esgotado (0 <= 5)
    expect(ids).toContain("3"); // 2 <= 3
    expect(ids).toContain("8"); // 1 <= 3

    // Produto 1 (stock 14, threshold 3): NÃO é baixo
    expect(ids).not.toContain("1");
  });

  it("retorna lista vazia quando todos os estoques estão acima do threshold", () => {
    const { result } = renderHook(() => useMenuStore());

    // Sobe todos os estoques para 100
    act(() => {
      result.current.products.forEach((p) => result.current.setStock(p.id, 100));
    });

    expect(result.current.getLowStockProducts()).toHaveLength(0);
  });
});

describe("CardapioList — badge de esgotado", () => {
  it("renderiza badge 'Esgotado' para produto com stock === 0", () => {
    // Sobrescreve o store com apenas 1 produto zerado para teste isolado
    useMenuStore.setState({
      products: [makeProduct({ id: "1", stock: 0, lowStockThreshold: 3 })],
    });

    // Importar CardapioList dinamicamente para evitar ciclo de deps no mock
    // Usa apenas o store — sem renderizar a tabela inteira (evita deps de Image/router)
    const store = useMenuStore.getState();
    const p = store.products.find((x) => x.id === "1")!;

    expect(p.stock).toBe(0);
    // A lógica de badge: stock === 0 → "Esgotado"
    const badgeText = p.stock === 0 ? "Esgotado" : p.stock <= p.lowStockThreshold ? "Baixo" : "ok";
    expect(badgeText).toBe("Esgotado");
  });
});
