import { describe, it, expect, beforeEach, vi } from "vitest";

import { createClientMock, localDatePlusDays, type Resolver } from "@/test-utils/supabase-mock";

// ── Mocks dos módulos externos da action ────────────────────────────────────
vi.mock("@/server/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/server/supabase/service", () => ({ createSupabaseServiceClient: vi.fn() }));
vi.mock("@/server/payments/abacatepay", () => ({
  createPixCharge: vi.fn(),
  createCheckout: vi.fn(),
  mapPixStatusToPaymentStatus: vi.fn(() => "pending"),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { placePreorderAction } from "./place-preorder";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { createSupabaseServiceClient } from "@/server/supabase/service";
import { createPixCharge, createCheckout } from "@/server/payments/abacatepay";

// ── Fixtures ────────────────────────────────────────────────────────────────
const PID = "11111111-1111-4111-8111-111111111111";
const USER = { id: "user_1", email: "ana@example.com" };

const PROFILE = {
  id: "user_1",
  first_name: "Ana",
  last_name: "Souza",
  phone: "31999990000",
  cpf: "11144477735",
};

const SETTINGS = {
  preorder_min_lead_days: 2,
  preorder_max_lead_days: 30,
  preorder_min_value_cents: 10000,
  preorder_daily_capacity: null as number | null,
  preorder_hour_from: 8,
  preorder_hour_to: 18,
};

const PRODUCT = {
  id: PID,
  name: "Bolo de pote",
  category: "bolos",
  price_site_cents: 5000,
  price_ifood_cents: 6000,
  active: true,
  deleted_at: null as string | null,
  available_for_preorder: true,
  abacatepay_product_id: "abacate_1",
};

function validInput(over: Record<string, unknown> = {}) {
  return {
    items: [{ productId: PID, qty: 3 }], // 3 × 5000 = 15000 ≥ 10000
    scheduledDate: localDatePlusDays(5),
    scheduledHour: 10,
    paymentMethod: "pix" as const,
    shippingAddress: {
      street: "Rua das Acácias",
      number: "100",
      neighborhood: "Savassi",
      city: "Belo Horizonte",
      state: "MG",
      cep: "30140-071",
    },
    shippingFee: 0,
    ...over,
  };
}

type SetupOpts = {
  user?: typeof USER | null;
  profile?: Record<string, unknown> | null;
  settings?: typeof SETTINGS;
  products?: Array<Record<string, unknown>>;
  productsError?: unknown;
  capacityCount?: number;
  couponRpc?: { valid: boolean; reason?: string; coupon_id?: string; discount_cents?: number };
  orderInsert?: { data?: unknown; error?: unknown };
  itemsError?: unknown;
};

const pixOk = {
  ok: true as const,
  charge: {
    id: "pay_1",
    brCode: "000201...",
    brCodeBase64: "data:image/png;base64,AAA",
    expiresAt: "2026-06-10T00:00:00Z",
    devMode: true,
    status: "PENDING",
  },
};

function setup(opts: SetupOpts = {}) {
  const serverResolver: Resolver = (ctx) => {
    if (ctx.table === "profiles")
      return { data: opts.profile === undefined ? PROFILE : opts.profile };
    if (ctx.table === "store_settings") return { data: opts.settings ?? SETTINGS };
    if (ctx.table === "orders" && ctx.count) return { count: opts.capacityCount ?? 0 };
    if (ctx.table === "products")
      return { data: opts.products ?? [PRODUCT], error: opts.productsError ?? null };
    if (ctx.table === "rpc:validate_coupon") return { data: opts.couponRpc ?? { valid: true } };
    return { data: null, error: null };
  };

  const serviceResolver: Resolver = (ctx) => {
    if (ctx.table === "orders" && ctx.mutation === "insert")
      return opts.orderInsert ?? { data: { id: "order_1", order_number: 42 }, error: null };
    if (ctx.table === "order_items") return { error: opts.itemsError ?? null };
    if (ctx.table === "payments") return { error: null };
    if (ctx.table === "orders" && ctx.mutation === "update") return { error: null };
    return { error: null };
  };

  vi.mocked(createSupabaseServerClient).mockResolvedValue(
    createClientMock(serverResolver, { user: opts.user === undefined ? USER : opts.user }) as never,
  );
  vi.mocked(createSupabaseServiceClient).mockReturnValue(
    createClientMock(serviceResolver) as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(createPixCharge).mockResolvedValue(pixOk as never);
  vi.mocked(createCheckout).mockResolvedValue({
    ok: true,
    checkout: {
      id: "chk_1",
      url: "https://pay.abacate/chk_1",
      status: "PENDING",
      externalId: "order_1",
    },
  } as never);
  setup();
});

describe("placePreorderAction — validações de entrada", () => {
  it("rejeita input inválido (carrinho vazio)", async () => {
    const r = await placePreorderAction(validInput({ items: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/inválidos/i);
  });

  it("exige login", async () => {
    setup({ user: null });
    const r = await placePreorderAction(validInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/login/i);
  });

  it("exige perfil cadastrado", async () => {
    setup({ profile: null });
    const r = await placePreorderAction(validInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/cadastro/i);
  });

  it("exige telefone (WhatsApp)", async () => {
    setup({ profile: { ...PROFILE, phone: null } });
    const r = await placePreorderAction(validInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/whatsapp/i);
  });

  it("exige CPF válido (11 dígitos)", async () => {
    setup({ profile: { ...PROFILE, cpf: "123" } });
    const r = await placePreorderAction(validInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/cpf/i);
  });
});

describe("placePreorderAction — regras de agendamento", () => {
  it("rejeita lead menor que o mínimo", async () => {
    const r = await placePreorderAction(validInput({ scheduledDate: localDatePlusDays(1) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/antecedência/i);
  });

  it("rejeita lead maior que o máximo", async () => {
    const r = await placePreorderAction(validInput({ scheduledDate: localDatePlusDays(40) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/no máximo 30/i);
  });

  it("rejeita hora fora da janela", async () => {
    const r = await placePreorderAction(validInput({ scheduledHour: 20 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/entre 8h e 18h/i);
  });

  it("rejeita data sem capacidade", async () => {
    setup({ settings: { ...SETTINGS, preorder_daily_capacity: 1 }, capacityCount: 1 });
    const r = await placePreorderAction(validInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/capacidade esgotada/i);
  });
});

describe("placePreorderAction — regras de produto e valor", () => {
  it("rejeita produto que não aceita encomenda", async () => {
    setup({ products: [{ ...PRODUCT, available_for_preorder: false }] });
    const r = await placePreorderAction(validInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/não aceita encomenda/i);
  });

  it("rejeita produto inativo ou removido", async () => {
    setup({ products: [{ ...PRODUCT, active: false }] });
    const r = await placePreorderAction(validInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/não está mais disponível/i);
  });

  it("rejeita abaixo do valor mínimo", async () => {
    const r = await placePreorderAction(validInput({ items: [{ productId: PID, qty: 1 }] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/mínima/i);
  });

  it("rejeita cupom inválido", async () => {
    setup({ couponRpc: { valid: false, reason: "already_used" } });
    const r = await placePreorderAction(validInput({ couponCode: "JATIVO" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/já usou/i);
  });
});

describe("placePreorderAction — sucesso e pagamento", () => {
  it("cria encomenda PIX com sucesso", async () => {
    const r = await placePreorderAction(validInput());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.orderId).toBe("order_1");
      expect(r.orderNumber).toBe(42);
      expect(r.paymentFallback).toBe(false);
      expect(r.redirectUrl).toBeUndefined();
    }
    expect(createPixCharge).toHaveBeenCalledTimes(1);
  });

  it("cria encomenda CARTÃO e retorna redirectUrl", async () => {
    const r = await placePreorderAction(validInput({ paymentMethod: "card" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.redirectUrl).toBe("https://pay.abacate/chk_1");
      expect(r.paymentFallback).toBe(false);
    }
    expect(createCheckout).toHaveBeenCalledTimes(1);
  });

  it("cai em fallback manual quando produto não tem ID AbacatePay (cartão)", async () => {
    setup({ products: [{ ...PRODUCT, abacatepay_product_id: null }] });
    const r = await placePreorderAction(validInput({ paymentMethod: "card" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.paymentFallback).toBe(true);
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("cai em fallback manual quando o PIX falha no gateway", async () => {
    vi.mocked(createPixCharge).mockResolvedValue({ ok: false, error: "gateway down" } as never);
    const r = await placePreorderAction(validInput());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.paymentFallback).toBe(true);
  });

  it("falha se o insert do pedido der erro", async () => {
    setup({ orderInsert: { data: null, error: { message: "db error" } } });
    const r = await placePreorderAction(validInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/não foi possível criar/i);
  });

  it("falha se o insert dos itens der erro", async () => {
    setup({ itemsError: { message: "items db error" } });
    const r = await placePreorderAction(validInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/itens/i);
  });
});
