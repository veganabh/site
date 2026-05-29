import type { Metadata } from "next";
import { Gift, Package, MessageCircle, MapPin } from "lucide-react";
import { ProductGridPhoto } from "@/components/dashboard/product-grid-photo";
import { CategoryCircles } from "@/components/dashboard/category-circles";
import { listProducts } from "@/server/products";
import { KitGrid } from "@/components/gift/kit-grid";

export const metadata: Metadata = {
  title: "Para Presentear — Veg.ana",
  description:
    "Doces veganos pra levar, mandar, emocionar. Kits curados com embalagem bonita e cartão personalizado.",
};

export default async function PresentearPage() {
  const giftProducts = await listProducts({ tag: "presente" });

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-labelledby="presentear-hero"
        className="relative flex min-h-[270px] flex-col justify-center overflow-hidden rounded-2xl bg-olive-900 p-5 text-paper-50 shadow-lg md:min-h-[305px] md:p-8"
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
            className="text-micro font-semibold tracking-wide text-terra-500 uppercase"
          >
            Para Presentear
          </p>
          <h1 className="text-h2 leading-tight font-extrabold text-paper-50 md:text-h1">
            Doces que viajam bonito
            <br className="hidden md:block" /> até quem você gosta.
          </h1>
          <p className="max-w-xl text-body-sm text-paper-50/80 md:text-body-sm">
            Monte um kit com os sabores da pessoa, deixe uma mensagem no cartão e a gente entrega na
            casa dela. Sem lactose, sem ovo, sem stress.
          </p>

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-caption text-paper-50/85">
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

      <section aria-labelledby="categorias" className="flex flex-col gap-2">
        <h2 id="categorias" className="text-h3 font-bold text-olive-900">
          Categorias
        </h2>
        <CategoryCircles active="presentear" basePath="/" />
      </section>

      <section aria-labelledby="kits-titulo" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="kits-titulo" className="text-h3 font-bold text-olive-900">
            Kits montados por você
          </h2>
          <p className="text-caption text-olive-700">
            Três formatos. Você escolhe os sabores dentro de cada um.
          </p>
        </div>

        <KitGrid />
      </section>

      {giftProducts.length > 0 && (
        <section aria-labelledby="presente-avulsos-titulo" className="flex flex-col gap-2.5">
          <div>
            <h2 id="presente-avulsos-titulo" className="text-h3 font-bold text-olive-900">
              Ou escolha um só
            </h2>
            <p className="mt-0.5 text-caption text-olive-700">
              Doces que viajam bem sozinhos — embalagem presente disponível no carrinho.
            </p>
          </div>
          <ProductGridPhoto products={giftProducts} />
        </section>
      )}
    </div>
  );
}
