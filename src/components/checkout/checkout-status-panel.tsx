"use client";

import { usePathname } from "next/navigation";
import { CheckCircle2, Circle, ClipboardList, Gift, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { computeCouponDiscount } from "@/lib/coupons";
import { ProductPhoto } from "@/components/features/product-photo";
import { useCartStore } from "@/stores/cart-store";
import { useAddressStore, selectCurrentAddress } from "@/stores/address-store";
import { useCheckoutStore, type CheckoutStep } from "@/stores/checkout-store";

type StepMeta = {
  id: CheckoutStep;
  label: string;
  sublabel: string;
};

const STEPS: StepMeta[] = [
  { id: "resumo", label: "Na cesta", sublabel: "Revise seus doces" },
  { id: "endereco", label: "Rumo à porta", sublabel: "Pra onde vai esse mimo" },
  { id: "pagamento", label: "Acertando a conta", sublabel: "Escolha como pagar" },
  { id: "confirmado", label: "Saindo do forno", sublabel: "Pedido a caminho" },
];

const STEP_ORDER: CheckoutStep[] = ["resumo", "endereco", "pagamento", "confirmado"];

function stepIndex(step: CheckoutStep): number {
  return STEP_ORDER.indexOf(step);
}

export function CheckoutStatusPanel({ className }: { className?: string }) {
  const storeStep = useCheckoutStore((s) => s.step);
  const pathname = usePathname();

  // Path > store. F5 em /obrigado zera a store em memória — pathname é a
  // fonte de verdade que sobrevive reload. Path /obrigado/* sempre cai em
  // "confirmado" mesmo com store resetado.
  const currentStep: CheckoutStep = pathname?.startsWith("/obrigado") ? "confirmado" : storeStep;
  const currentIdx = stepIndex(currentStep);

  // Resumo aparece em endereço e pagamento — acompanha usuário até pagar
  const showSummary = currentStep === "endereco" || currentStep === "pagamento";

  return (
    <aside
      aria-label="Status do pedido"
      className={cn(
        "hidden h-full w-full shrink-0 flex-col border-l border-divider bg-paper-50 xl:flex xl:w-[360px]",
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-3 overflow-hidden px-4 pt-3 pb-4 md:pt-4">
        <header className="flex shrink-0 items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-body-sm font-semibold text-olive-900">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            Status do pedido
          </h2>
        </header>

        <ol aria-label="Etapas do checkout" className="mt-2 flex shrink-0 flex-col">
          {STEPS.map((s, idx) => {
            const isComplete = idx < currentIdx;
            const isActive = idx === currentIdx;
            const isLast = idx === STEPS.length - 1;

            return (
              <li key={s.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <StepCircle isComplete={isComplete} isActive={isActive} label={s.label} />
                  {!isLast && (
                    <div
                      className={cn(
                        "mt-0.5 w-px flex-1",
                        isComplete ? "bg-olive-900" : "bg-divider",
                      )}
                      style={{ minHeight: "1.75rem" }}
                      aria-hidden="true"
                    />
                  )}
                </div>

                <div className="pt-0.5 pb-5">
                  <p
                    className={cn(
                      "text-body-sm leading-snug font-semibold",
                      isComplete || isActive ? "text-olive-900" : "text-olive-500",
                    )}
                  >
                    {s.label}
                  </p>
                  {(isActive || isComplete) && (
                    <p className="mt-0.5 text-micro text-olive-700">{s.sublabel}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {showSummary && <OrderSummaryMini />}
      </div>
    </aside>
  );
}

// ── Resumo mini do pedido (endereço + pagamento) ──────────────────────────

function OrderSummaryMini() {
  const items = useCartStore((s) => s.items);
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const currentAddress = useAddressStore(selectCurrentAddress);
  const step = useCheckoutStore((s) => s.step);

  if (items.length === 0) return null;

  const subtotal = items.reduce((acc, i) => acc + i.product.price_site * i.quantity, 0);
  const shippingFee = step === "pagamento" ? (currentAddress?.shippingFee ?? 0) : 0;
  const cartCtx = { subtotal, shippingFee };
  const couponDiscount = appliedCoupon ? computeCouponDiscount(appliedCoupon, cartCtx) : 0;
  const total = subtotal - couponDiscount + shippingFee;

  return (
    <section
      aria-labelledby="summary-mini-heading"
      className="flex min-h-0 flex-1 flex-col gap-2 border-t border-divider pt-3"
    >
      <h3
        id="summary-mini-heading"
        className="shrink-0 text-micro font-semibold tracking-wide text-olive-700 uppercase"
      >
        Resumo do pedido
      </h3>

      <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
        {items.map((item) => (
          <li
            key={item.product.id}
            className={cn(
              "flex items-center gap-2 rounded-sm px-1.5 py-1",
              item.fromCrossSell && "bg-leaf-500/5",
            )}
          >
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-sm bg-paper-100">
              <ProductPhoto product={item.product} sizes="32px" />
              {item.fromCrossSell && (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -left-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-leaf-500 text-paper-50 shadow-sm"
                >
                  <Gift className="h-2 w-2" />
                </span>
              )}
            </div>
            <p className="min-w-0 flex-1 truncate text-micro font-medium text-olive-900">
              {item.product.name}
            </p>
            <span className="shrink-0 text-micro text-olive-700">{item.quantity}×</span>
            <span className="w-14 shrink-0 text-right text-micro font-semibold text-olive-900 tabular-nums">
              {formatBRL(item.product.price_site * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="flex shrink-0 flex-col gap-1 rounded-sm bg-paper-100 px-2.5 py-2 text-micro">
        <div className="flex justify-between">
          <dt className="text-olive-700">Subtotal</dt>
          <dd className="font-semibold text-olive-900 tabular-nums">{formatBRL(subtotal)}</dd>
        </div>
        {appliedCoupon && couponDiscount > 0 && (
          <div className="flex justify-between">
            <dt className="inline-flex items-center gap-1 text-olive-700">
              <Tag className="h-2.5 w-2.5" aria-hidden="true" />
              {appliedCoupon.code}
            </dt>
            <dd className="font-semibold text-terra-700 tabular-nums">
              −{formatBRL(couponDiscount)}
            </dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-olive-700">Entrega</dt>
          <dd className="font-semibold text-olive-900 tabular-nums">
            {shippingFee > 0 ? formatBRL(shippingFee) : "Grátis"}
          </dd>
        </div>
        <div className="mt-0.5 flex justify-between border-t border-divider pt-1.5">
          <dt className="font-semibold text-olive-900">Total</dt>
          <dd className="text-body-sm font-bold text-olive-900 tabular-nums">{formatBRL(total)}</dd>
        </div>
      </dl>
    </section>
  );
}

function StepCircle({
  isComplete,
  isActive,
  label,
}: {
  isComplete: boolean;
  isActive: boolean;
  label: string;
}) {
  if (isComplete) {
    return (
      <span
        aria-label={`${label}: concluído`}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-olive-900"
      >
        <CheckCircle2 className="h-4 w-4 text-paper-50" aria-hidden="true" />
      </span>
    );
  }

  if (isActive) {
    return (
      <span
        aria-label={`${label}: etapa atual`}
        className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-terra-500 bg-terra-500/10"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-terra-500" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      aria-label={`${label}: pendente`}
      className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-divider bg-paper-100"
    >
      <Circle className="h-3 w-3 text-olive-500" aria-hidden="true" />
    </span>
  );
}
