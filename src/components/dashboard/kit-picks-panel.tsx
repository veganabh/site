"use client";

import { useMemo } from "react";
import { Gift, Package, Sparkles, Check } from "lucide-react";
import { ProductPhoto } from "@/components/features/product-photo";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { GIFT_PACKAGING_PRICE } from "@/types/gift-kit";
import { useGiftKitDraftStore } from "@/stores/gift-kit-draft-store";
import { useGiftKitsStore } from "@/stores/gift-kits-store";
import { useMenuStore } from "@/stores/menu-store";

type KitPicksPanelProps = { className?: string };

/**
 * Painel lateral exibido enquanto o cliente monta um kit (substitui o
 * OrderDetailPanel padrão na rota `/presentear/[slug]/montar`).
 *
 * Espelha o draft store — picks viram lista de cards conforme o cliente
 * vai escolhendo. Total inclui embalagem (+R$10) quando ativada.
 */
export function KitPicksPanel({ className }: KitPicksPanelProps) {
  const templateId = useGiftKitDraftStore((s) => s.templateId);
  const picks = useGiftKitDraftStore((s) => s.picks);
  const packaging = useGiftKitDraftStore((s) => s.packaging);
  const products = useMenuStore((s) => s.products);
  const kits = useGiftKitsStore((s) => s.kits);

  const template = templateId ? (kits.find((k) => k.id === templateId) ?? null) : null;
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const pickedItems = useMemo(() => {
    if (!template) return [];
    type Product = NonNullable<ReturnType<typeof productsById.get>>;
    type Row = { productId: string; name: string; product: Product; count: number };
    const counts = new Map<string, number>();
    for (const slot of template.slots) {
      const pickEntry = picks.find((p) => p.slotId === slot.id);
      if (!pickEntry) continue;
      for (const productId of pickEntry.productIds) {
        counts.set(productId, (counts.get(productId) ?? 0) + 1);
      }
    }
    const rows: Row[] = [];
    for (const [productId, count] of counts.entries()) {
      const product = productsById.get(productId);
      if (!product) continue;
      rows.push({ productId, name: product.name, product, count });
    }
    return rows;
  }, [template, picks, productsById]);

  const totalPicks = pickedItems.reduce((acc, r) => acc + r.count, 0);
  const expectedPicks = template?.slots.reduce((acc, s) => acc + s.qty, 0) ?? 0;
  const finalPrice = (template?.price ?? 0) + (packaging ? GIFT_PACKAGING_PRICE : 0);
  const ifoodAnchor = (template?.priceIfoodAnchor ?? 0) + (packaging ? GIFT_PACKAGING_PRICE : 0);
  const savings = Math.max(0, ifoodAnchor - finalPrice);

  return (
    <aside
      aria-label="Itens do kit em montagem"
      className={cn(
        "hidden h-full w-full shrink-0 flex-col border-l border-divider bg-leaf-500/5 xl:flex xl:w-[360px] xl:rounded-br-lg",
        className,
      )}
    >
      <div className="relative flex flex-1 flex-col gap-3 overflow-hidden px-4 pt-3 pb-4 md:pt-4 xl:sticky xl:top-[72px] xl:h-[calc(100vh-72px)] xl:flex-none">
        <header className="flex shrink-0 items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-2 text-body-sm font-semibold text-olive-900">
            <Gift className="h-4 w-4" aria-hidden="true" />
            {template?.name ?? "Kit em montagem"}
          </h2>
          <span className="text-micro font-semibold tracking-wide text-olive-700 uppercase">
            presente
          </span>
        </header>

        {template && <p className="shrink-0 text-micro text-olive-700">{template.tagline}</p>}

        {savings > 0 && (
          <div className="flex shrink-0 items-center gap-1 text-micro font-semibold text-leaf-700">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {formatBRL(savings)} a menos que no iFood
          </div>
        )}

        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
          {template?.slots.map((slot) => {
            const slotPicks = picks.find((p) => p.slotId === slot.id)?.productIds ?? [];
            const filled = slotPicks.length === slot.qty;
            const slotCounts = new Map<string, number>();
            for (const id of slotPicks) {
              slotCounts.set(id, (slotCounts.get(id) ?? 0) + 1);
            }
            return (
              <li
                key={slot.id}
                className={cn(
                  "flex flex-col gap-2 rounded-md border p-2.5",
                  filled
                    ? "border-leaf-500/40 bg-leaf-500/5"
                    : slotPicks.length > 0
                      ? "border-divider bg-paper-50"
                      : "border-dashed border-divider bg-paper-100/40",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-micro font-bold text-olive-900">{slot.label}</p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-micro font-semibold",
                      filled ? "text-leaf-700" : "text-olive-700",
                    )}
                  >
                    {filled && <Check className="h-3 w-3" aria-hidden="true" />}
                    {slotPicks.length}/{slot.qty}
                  </span>
                </div>

                {slotPicks.length === 0 ? (
                  <p className="text-micro text-olive-700/70 italic">a escolher</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {Array.from(slotCounts.entries()).map(([productId, count]) => {
                      const product = productsById.get(productId);
                      if (!product) return null;
                      return (
                        <li key={productId} className="flex items-center gap-2">
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-sm bg-paper-100">
                            <ProductPhoto product={product} sizes="36px" />
                          </div>
                          <p className="min-w-0 flex-1 truncate text-caption font-medium text-olive-900">
                            {product.name}
                          </p>
                          {count > 1 && (
                            <span className="shrink-0 text-micro font-semibold text-olive-700">
                              {count}×
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        {packaging && (
          <Card padding="sm" className="flex shrink-0 items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sage-300/40 text-olive-900">
              <Package className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <p className="flex-1 text-caption font-semibold text-olive-900">
              Embalagem de presente
            </p>
            <span className="text-micro font-semibold text-olive-900">
              +{formatBRL(GIFT_PACKAGING_PRICE)}
            </span>
          </Card>
        )}

        <div className="flex shrink-0 flex-col gap-1 rounded-md bg-paper-100 p-3">
          <div className="flex items-center justify-between text-micro text-olive-700">
            <span>
              {totalPicks} de {expectedPicks} escolhidos
            </span>
            <span className="font-semibold text-olive-900">{formatBRL(finalPrice)}</span>
          </div>
          <p className="text-micro text-olive-700/70">
            Continue o passo a passo pra finalizar o kit.
          </p>
        </div>
      </div>
    </aside>
  );
}
