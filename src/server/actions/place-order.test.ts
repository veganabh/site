import { describe, it, expect, beforeEach, vi } from "vitest";

import { createClientMock, type Resolver } from "@/test-utils/supabase-mock";

vi.mock("@/server/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/server/supabase/service", () => ({ createSupabaseServiceClient: vi.fn() }));
vi.mock("@/server/payments/abacatepay", () => ({
  createPixCharge: vi.fn(),
  createCheckout: vi.fn(),
  mapPixStatusToPaymentStatus: vi.fn(() => "pending"),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { placeOrderAction } from "./place-order";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { createSupabaseServiceClient } from "@/server/supabase/service";
import { createPixCharge, createCheckout } from "@/server/payments/abacatepay";

const PID = "22222222-2222-4222-8222-222222222222";
const USER = { id: "user_1", email: "ana@example.com" };

const PROFILE = {
  id: "user_1",
  first_name: "Ana",
  last_name: "Souza",
  phone: "31999990000",
  cpf: "11144477735",
};

const PRODUCT = {
  id: PID,
  name: "Brigadeiro gourmet",
  category: "doces",
  price_site_cents: 4000,
  price_ifood_cents: 5000,
  active: true,
  deleted_at: null as string | null,
  stock: 10,
  abacatepay_product_id: "abacate_2",
};

function validInput(over: Record<string, unknown> = {}) {
  return {
    items: [{ productId: PID, qty: 2 }],
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
  products?: Array<Record<string, unknown>>;
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
    if (ctx.table === "products") return { data: opts.products ?? [PRODUCT], error: null };
    if (ctx.table === "rpc:validate_coupon") return { data: opts.couponRpc ?? { valid: true } };
    return { data: null, error: null };
  };

  const serviceResolver: Resolver = (ctx) => {
    if (ctx.table === "orders" && ctx.mutation === "insert")
      return opts.orderInsert ?? { data: { id: "order_1", order_number: 7 }, error: null };
    if (ctx.table === "order_items") return { error: opts.itemsError ?? null };
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

describe("placeOrderAction — validações", () => {
  it("rejeita input inválido (carrinho vazio)", async () => {
    const r = await placeOrderAction(validInput({ items: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/inválidos/i);
  });

  it("exige login", async () => {
    setup({ user: null });
    const r = await placeOrderAction(validInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/login/i);
  });

  it("exige telefone", async () => {
    setup({ profile: { ...PROFILE, phone: null } });
    const r = await placeOrderAction(validInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/whatsapp/i);
  });

  it("exige CPF válido", async () => {
    setup({ profile: { ...PROFILE, cpf: null } });
    const r = await placeOrderAction(validInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/cpf/i);
  });

  it("rejeita estoque insuficiente", async () => {
    setup({ products: [{ ...PRODUCT, stock: 1 }] });
    const r = await placeOrderAction(validInput({ items: [{ productId: PID, qty: 3 }] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/unidades suficientes/i);
  });

  it("rejeita produto indisponível", async () => {
    setup({ products: [{ ...PRODUCT, active: false }] });
    const r = await placeOrderAction(validInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/não está mais disponível/i);
  });

  it("rejeita cupom inválido", async () => {
    setup({ couponRpc: { valid: false, reason: "not_first_purchase" } });
    const r = await placeOrderAction(validInput({ couponCode: "PRIMEIRA" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/primeira compra/i);
  });
});

describe("placeOrderAction — sucesso e pagamento", () => {
  it("cria pedido PIX com sucesso", async () => {
    const r = await placeOrderAction(validInput());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.orderId).toBe("order_1");
      expect(r.orderNumber).toBe(7);
      expect(r.paymentFallback).toBe(false);
      expect(r.redirectUrl).toBeUndefined();
    }
    expect(createPixCharge).toHaveBeenCalledTimes(1);
  });

  it("cria pedido CARTÃO e retorna redirectUrl", async () => {
    const r = await placeOrderAction(validInput({ paymentMethod: "card" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.redirectUrl).toBe("https://pay.abacate/chk_1");
    expect(createCheckout).toHaveBeenCalledTimes(1);
  });

  it("cai em fallback manual quando o PIX falha", async () => {
    vi.mocked(createPixCharge).mockResolvedValue({ ok: false, error: "gateway down" } as never);
    const r = await placeOrderAction(validInput());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.paymentFallback).toBe(true);
  });

  it("falha se o insert do pedido der erro", async () => {
    setup({ orderInsert: { data: null, error: { message: "db error" } } });
    const r = await placeOrderAction(validInput());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/não foi possível criar/i);
  });
});
