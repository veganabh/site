/**
 * top-skus-list.tsx — Lista dos top SKUs vendidos no dia.
 *
 * Server Component: recebe lista pré-calculada de SkuStat como props.
 * Thumbnail buscado em mockProducts pelo productId.
 */

import Image from "next/image";
import { mockProducts } from "@/lib/mock-products";
import type { SkuStat } from "@/lib/dashboard-metrics";

type TopSkusListProps = {
  skus: SkuStat[];
};

export function TopSkusList({ skus }: TopSkusListProps) {
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
          const product = mockProducts.find((p) => p.id === sku.productId);
          const isTop = index === 0;
          const revenue = sku.revenue.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          });

          return (
            <li key={sku.productId} className="flex items-center gap-2">
              {/* Thumbnail */}
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-sm bg-paper-100">
                {product?.photo?.url ? (
                  <Image
                    src={product.photo.url}
                    alt={product.photo.alt ?? sku.productName}
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
