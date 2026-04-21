import type { Metadata } from "next";
import Link from "next/link";
import { Gift, ArrowRight, Package, MessageCircle, MapPin } from "lucide-react";
import { ProductGridPhoto } from "@/components/dashboard/product-grid-photo";
import { CategoryCircles } from "@/components/dashboard/category-circles";
import { mockGiftKits } from "@/lib/mock-gift-kits";
import { mockProducts } from "@/lib/mock-products";
import { formatBRL } from "@/lib/format";
import { KitCoverPhoto } from "@/components/gift/kit-cover-photo";

export const metadata: Metadata = {
  title: "Para Presentear — Veg.ana",
  description:
    "Doces veganos pra levar, mandar, emocionar. Kits curados com embalagem bonita e cartão personalizado.",
};

export default function PresentearPage() {
  const kits = mockGiftKits.filter((k) => k.active);
  const giftProducts = mockProducts.filter((p) =>
    p.tags.includes("presente"),
  );

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-labelledby="presentear-hero"
        className="relative overflow-hidden rounded-2xl bg-olive-900 p-5 text-paper-50 shadow-lg md:p-8"
      >
        <Gift
          className="pointer-events-none absolute -top-6 -right-6 h-36 w-36 text-terra-500/30"
          aria-hidden="true"
          strokeWidth={1}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-terra-500/15 blur-3xl"
        />

        <div className="relative flex flex-col gap-3">
          <p
            id="presentear-hero"
            className="text-[11px] font-semibold tracking-wide text-terra-500 uppercase"
          >
            Para Presentear
          </p>
          <h1 className="text-[28px] font-extrabold leading-tight text-paper-50 md:text-[40px]">
            Doces que viajam bonito
            <br className="hidden md:block" /> até quem você gosta.
          </h1>
          <p className="max-w-xl text-[13px] text-paper-50/80 md:text-[14px]">
            Monte um kit com os sabores da pessoa, deixe uma mensagem no cartão
            e a gente entrega na casa dela. Sem lactose, sem ovo, sem stress.
          </p>

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-paper-50/85">
            <li className="inline-flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-terra-500" aria-hidden="true" />
              embalagem pra presente
            </li>
            <li className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5 text-terra-500" aria-hidden="true" />
              cartão com sua mensagem
            </li>
            <li className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-terra-500" aria-hidden="true" />
              entrega no endereço dela
            </li>
          </ul>
        </div>
      </section>

      <CategoryCircles active="presentear" basePath="/" />

      <section aria-labelledby="kits-titulo" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="kits-titulo" className="text-h3 font-bold text-olive-900">
            Kits montados por você
          </h2>
          <p className="text-[12px] text-olive-700">
            Três formatos. Você escolhe os sabores dentro de cada um.
          </p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kits.map((kit) => {
            const Icon = kit.icon;
            const totalItems = kit.slots.reduce((acc, s) => acc + s.qty, 0);
            return (
              <li key={kit.id}>
                <Link
                  href={`/presentear/${kit.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-divider bg-paper-50 shadow-sm transition-shadow md:hover:shadow-md"
                  aria-label={`Ver detalhes do ${kit.name}`}
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
                    <h3 className="text-[15px] font-bold leading-tight text-olive-900">
                      {kit.name}
                    </h3>
                    <p className="text-[12px] leading-snug text-olive-700">
                      {kit.tagline}
                    </p>

                    <ul className="mt-1 flex flex-col gap-0.5">
                      {kit.slots.map((s) => (
                        <li
                          key={s.id}
                          className="text-[11px] text-olive-700"
                        >
                          · {s.qty} × {s.label.replace(/^Escolha( o| a| os| as| \d+)? /i, "").replace(/^/, (c) => c.toLowerCase())}
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
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {giftProducts.length > 0 && (
        <section aria-labelledby="presente-avulsos-titulo" className="flex flex-col gap-2.5">
          <div>
            <h2
              id="presente-avulsos-titulo"
              className="text-h3 font-bold text-olive-900"
            >
              Ou escolha um só
            </h2>
            <p className="mt-0.5 text-[12px] text-olive-700">
              Doces que viajam bem sozinhos — embalagem presente disponível no
              carrinho.
            </p>
          </div>
          <ProductGridPhoto products={giftProducts} />
        </section>
      )}
    </div>
  );
}
