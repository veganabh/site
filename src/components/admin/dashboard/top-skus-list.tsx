/**
 * top-skus-list.tsx — Lista dos top SKUs vendidos no dia.
 *
 * Server Component: recebe lista pré-calculada de SkuStat + map de
 * thumbnails (productId → photo) montado pelo caller.
 */

import Image from "next/image";
import type { SkuStat } from "@/lib/dashboard-metrics";

export type ProductThumb = { url: string; alt: string };

type TopSkusListProps = {
  skus: SkuStat[];
  thumbs: Map<string, ProductThumb>;
};

export function TopSkusList({ skus, thumbs }: TopSkusListProps) {
  if (skus.length === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-divider bg-paper-50 p-4 shadow-sm">
        <h2 className="text-body-sm font-bold text-olive-900">Top produtos do dia</h2>
        <p className="text-caption text-olive-700">Nenhum pedido registrado hoje ainda.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-divider bg-paper-50 p-4 shadow-sm">
      <h2 className="text-body-sm font-bold text-olive-900">Top produtos do dia</h2>

      <ol className="flex flex-col gap-2">
        {skus.map((sku, index) => {
          const thumb = thumbs.get(sku.productId);
          const isTop = index === 0;
          const revenue = sku.revenue.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          });

          return (
            <li key={sku.productId} className="flex items-center gap-2">
              {/* Thumbnail */}
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-sm bg-paper-100">
                {thumb ? (
                  <Image
                    src={thumb.url}
                    alt={thumb.alt || sku.productName}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[10px] text-olive-700">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex min-w-0 flex-1 flex-col gap-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-caption font-semibold text-olive-900">
                    {sku.productName}
                  </span>
                  {isTop && (
                    <span className="shrink-0 rounded-pill bg-terra-500/10 px-1.5 py-0 text-[10px] font-bold tracking-wide text-terra-700 uppercase">
                      top
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-olive-700">
                  {sku.qtySold}x vendidos · {revenue}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
