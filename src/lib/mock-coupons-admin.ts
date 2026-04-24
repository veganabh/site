import type { Coupon, CouponStatus } from "@/types/coupon";

/**
 * Cupons para o CRUD admin.
 *
 * Separado de `lib/coupons.ts` — aquele arquivo contém a lógica de desconto
 * voltada ao cliente (função `discount`, validação no checkout). Este contém
 * o shape persistível para /gestao/cupons.
 *
 * Ao migrar pro Supabase: substituir este array por queries à tabela `coupons`.
 */

export const MOCK_COUPONS: Coupon[] = [
  {
    id: "cpn-001",
    code: "VEGANA10",
    label: "VEGANA10",
    hint: "−10% no pedido",
    type: "PERCENTUAL",
    value: 10,
    minOrderValue: undefined,
    maxUses: undefined,
    usedCount: 87,
    validFrom: "2026-01-01",
    validUntil: undefined,
    status: "ATIVO",
    createdAt: "2026-01-01T10:00:00.000Z",
  },
  {
    id: "cpn-002",
    code: "FRETE0",
    label: "FRETE0",
    hint: "frete grátis",
    type: "FRETE_GRATIS",
    value: 0,
    minOrderValue: undefined,
    maxUses: undefined,
    usedCount: 142,
    validFrom: "2026-01-01",
    validUntil: undefined,
    status: "ATIVO",
    createdAt: "2026-01-01T10:00:00.000Z",
  },
  {
    id: "cpn-003",
    code: "BEM5",
    label: "BEM5",
    hint: "−R$ 5,00",
    type: "FIXO",
    value: 5,
    minOrderValue: undefined,
    maxUses: undefined,
    usedCount: 34,
    validFrom: "2026-02-01",
    validUntil: undefined,
    status: "ATIVO",
    createdAt: "2026-02-01T09:00:00.000Z",
  },
  {
    id: "cpn-004",
    code: "LANCHE5",
    label: "LANCHE5",
    hint: "−R$ 5,00 em pedidos acima de R$ 30",
    type: "FIXO",
    value: 5,
    minOrderValue: 30,
    maxUses: 100,
    usedCount: 23,
    validFrom: "2026-03-01",
    validUntil: "2026-06-30",
    status: "ATIVO",
    createdAt: "2026-03-01T08:00:00.000Z",
  },
  {
    id: "cpn-005",
    code: "BOAS10",
    label: "BOAS10",
    hint: "−10% de boas-vindas",
    type: "PERCENTUAL",
    value: 10,
    minOrderValue: undefined,
    maxUses: 50,
    usedCount: 50,
    validFrom: "2026-01-15",
    validUntil: "2026-04-15",
    status: "EXPIRADO",
    createdAt: "2026-01-15T12:00:00.000Z",
  },
];

// ── Lookups ───────────────────────────────────────────────────────────────────

export function getCouponById(id: string): Coupon | undefined {
  return MOCK_COUPONS.find((c) => c.id === id);
}

export function getCouponByCode(code: string): Coupon | undefined {
  return MOCK_COUPONS.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
}

// ── Lógica de status ──────────────────────────────────────────────────────────

/**
 * Recalcula o status real de um cupom com base nas regras de negócio.
 * Útil para exibir badge correto na listagem admin sem depender do campo `status`
 * salvo (que pode estar desatualizado).
 *
 * Regras (em ordem de prioridade):
 * 1. Se `validUntil` existe e já passou → EXPIRADO
 * 2. Se `maxUses` existe e `usedCount >= maxUses` → EXPIRADO
 * 3. Caso contrário → usa o `status` salvo no registro
 */
export function computeCouponStatus(coupon: Coupon): CouponStatus {
  const now = new Date();

  if (coupon.validUntil) {
    const expiry = new Date(coupon.validUntil);
    if (expiry < now) return "EXPIRADO";
  }

  if (coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) {
    return "EXPIRADO";
  }

  return coupon.status;
}
