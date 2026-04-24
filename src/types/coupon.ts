/**
 * Tipos formais de cupom para o módulo admin.
 *
 * Separado de `lib/coupons.ts` intencionalmente:
 * - `lib/coupons.ts` — validador do cliente (tem a função `discount`, COUPONS_MAP)
 * - `types/coupon.ts` — shape persistível para CRUD no admin e futuro DB
 *
 * Quando migrar pro Supabase, este tipo mapeia diretamente para a tabela `coupons`.
 */

export type CouponType = "PERCENTUAL" | "FIXO" | "FRETE_GRATIS";

export type CouponStatus = "ATIVO" | "INATIVO" | "EXPIRADO";

export type Coupon = {
  id: string;
  /** Código que o cliente digita. Sempre UPPER_CASE. */
  code: string;
  /** Rótulo curto exibido no chip da UI (ex: "VEGANA10"). */
  label: string;
  /** Descrição da vantagem exibida ao cliente (ex: "−10% no pedido"). */
  hint: string;
  type: CouponType;
  /**
   * Valor do desconto conforme o tipo:
   * - PERCENTUAL: 0–100 (%)
   * - FIXO: valor em R$
   * - FRETE_GRATIS: ignorado (desconto = valor do frete no momento)
   */
  value: number;
  /** Valor mínimo do pedido para o cupom ser aplicável. Undefined = sem mínimo. */
  minOrderValue?: number;
  /** Limite de usos totais. Undefined = ilimitado. */
  maxUses?: number;
  /** Quantas vezes já foi usado. */
  usedCount: number;
  /** ISO date — quando começa a valer. */
  validFrom: string;
  /** ISO date — quando expira. Undefined = sem expiração. */
  validUntil?: string;
  status: CouponStatus;
  /** ISO datetime — quando foi criado. */
  createdAt: string;
};
