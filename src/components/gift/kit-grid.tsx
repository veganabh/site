"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { KitCoverPhoto } from "@/components/gift/kit-cover-photo";
import { KitDeliveryGate } from "@/components/gift/kit-delivery-gate";
import { formatBRL } from "@/lib/format";
import { resolveKitIcon } from "@/lib/kit-icons";
import { useGiftKitsStore } from "@/stores/gift-kits-store";
import type { GiftKitTemplate } from "@/types/gift-kit";

export function KitGrid() {
  const allKits = useGiftKitsStore((s) => s.kits);
  const kits = allKits.filter((k) => k.active);
  const [selectedKit, setSelectedKit] = useState<GiftKitTemplate | null>(null);

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kits.map((kit) => {
          const Icon = resolveKitIcon(kit.iconName);
          const totalItems = kit.slots.reduce((acc, s) => acc + s.qty, 0);
          return (
            <li key={kit.id}>
              <button
                type="button"
                onClick={() => setSelectedKit(kit)}
                className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-divider bg-paper-50 text-left shadow-sm transition-shadow md:hover:shadow-md"
                aria-label={`Escolher ${kit.name}`}
              >
                <div className="relative aspect-[5/3] overflow-hidden bg-paper-100">
                  <KitCoverPhoto
                    photo={kit.coverPhoto}
                    className="transition-transform duration-500 md:group-hover:scale-[1.03]"
                  />
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-pill bg-paper-50/95 px-2.5 py-1 text-[11px] font-bold text-olive-900 shadow-sm backdrop-blur-sm">
                    <Icon className="h-3 w-3 text-terra-700" aria-hidden="true" />
                    {totalItems} itens
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="text-[15px] leading-tight font-bold text-olive-900">
                    {kit.name}
                  </h3>
                  <p className="text-[12px] leading-snug text-olive-700">{kit.tagline}</p>

                  <ul className="mt-1 flex flex-col gap-0.5">
                    {kit.slots.map((s) => (
                      <li key={s.id} className="text-[11px] text-olive-700">
                        · {s.qty} ×{" "}
                        {s.label
                          .replace(/^Escolha( o| a| os| as| \d+)? /i, "")
                          .replace(/^/, (c) => c.toLowerCase())}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto flex items-end justify-between pt-2">
                    <div className="flex flex-col leading-tight">
                      <span className="text-body font-bold text-olive-900">
                        {formatBRL(kit.price)}
                      </span>
                      <span className="text-[10px] text-olive-700 line-through">
                        iFood {formatBRL(kit.priceIfoodAnchor)}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-terra-700">
                      Montar
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform md:group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <KitDeliveryGate
        open={selectedKit !== null}
        kit={selectedKit}
        onClose={() => setSelectedKit(null)}
      />
    </>
  );
}
