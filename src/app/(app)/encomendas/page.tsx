import type { Metadata } from "next";
import { CalendarClock, CalendarDays, BadgeDollarSign, Clock } from "lucide-react";

import { listProducts } from "@/server/products";
import { getStoreSettings } from "@/server/store-settings";
import { ProductGridPhoto } from "@/components/dashboard/product-grid-photo";
import { CategoryCircles } from "@/components/dashboard/category-circles";
import { DeliveryGate } from "@/components/dashboard/delivery-gate";
import { formatBRL } from "@/lib/format";

export const metadata: Metadata = {
  title: "Encomendas — Veg.ana",
  description:
    "Peça seus doces com antecedência. Bolos, bombons e docinhos feitos sob encomenda para sua data especial.",
};

export default async function EncomendasPage() {
  const [products, settings] = await Promise.all([
    listProducts({ onlyActive: true }),
    getStoreSettings(),
  ]);

  const preorderProducts = products.filter((p) => p.availableForPreorder);
  const { preorder } = settings;
  const minBRL = formatBRL(preorder.minValueCents / 100);

  return (
    <div className="flex flex-col gap-5">
      {/* Hero banner — mesmo padrão do /presentear */}
      <section
        aria-labelledby="encomendas-hero"
        className="relative flex min-h-[216px] flex-col justify-center overflow-hidden rounded-sm bg-olive-900 p-5 text-paper-50 shadow-lg md:min-h-[244px] md:p-8"
      >
        <CalendarClock
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
            id="encomendas-hero"
            className="text-micro font-semibold tracking-wide text-terra-500 uppercase"
          >
            Encomendas
          </p>
          <h1 className="text-h2 leading-tight font-extrabold text-paper-50 md:text-h1">
            Doces feitos sob medida.
          </h1>
          <p className="max-w-xl text-body-sm text-paper-50 md:text-body-sm">
            Pague agora, receba na hora combinada — a gente cuida de tudo com o mesmo cuidado de
            sempre.
          </p>

          {/* Como funciona — dinâmico a partir de store_settings */}
          <ul className="mt-3 flex flex-col gap-2 text-caption text-paper-50 sm:flex-row sm:gap-6">
            <li className="flex items-start gap-2">
              <CalendarDays
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terra-500"
                aria-hidden="true"
              />
              <span>
                Peça com{" "}
                <strong className="text-paper-50">
                  {preorder.minLeadDays} a {preorder.maxLeadDays} dias
                </strong>{" "}
                de antecedência
              </span>
            </li>
            <li className="flex items-start gap-2">
              <BadgeDollarSign
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terra-500"
                aria-hidden="true"
              />
              <span>
                Mínimo de <strong className="text-paper-50">{minBRL}</strong> — pago antecipado
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terra-500" aria-hidden="true" />
              <span>
                Entrega entre{" "}
                <strong className="text-paper-50">
                  {preorder.hourFrom}h e {preorder.hourTo}h
                </strong>
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Categorias + DeliveryGate */}
      <section aria-labelledby="categorias-enc" className="flex flex-col gap-2">
        <h2 id="categorias-enc" className="text-h3 font-bold text-olive-900">
          Categorias
        </h2>
        <div className="flex items-stretch gap-3">
          <CategoryCircles active="encomendas" basePath="/" className="min-w-0 flex-1" />
          <DeliveryGate
            variant="card"
            label="Entregamos encomendas aí?"
            className="hidden w-[300px] shrink-0 md:flex"
          />
        </div>
      </section>

      {/* DeliveryGate mobile */}
      <div className="md:hidden">
        <DeliveryGate label="Entregamos encomendas aí?" />
      </div>

      {/* Catálogo de produtos para encomenda — card normal */}
      <section aria-labelledby="encomendas-catalogo" className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between md:gap-3">
          <div>
            <h2 id="encomendas-catalogo" className="text-h3 font-bold text-olive-900">
              Disponíveis para encomenda
            </h2>
            <p className="mt-0.5 text-caption text-olive-700">
              Escolha, adicione na cesta e finalize com data e horário.
            </p>
          </div>
          <p className="inline-flex items-center gap-1.5 text-micro text-olive-700">
            <span className="h-1.5 w-1.5 rounded-full bg-terra-500" aria-hidden="true" />
            {preorderProducts.length} {preorderProducts.length === 1 ? "item" : "itens"} · encomenda
          </p>
        </div>

        {preorderProducts.length === 0 ? (
          <div className="rounded-sm border border-divider bg-paper-100 px-6 py-12 text-center">
            <CalendarClock className="mx-auto mb-3 h-8 w-8 text-olive-500" aria-hidden="true" />
            <p className="text-body font-semibold text-olive-900">
              Nenhum produto disponível para encomenda agora.
            </p>
            <p className="mt-1 text-body-sm text-olive-700">
              Confira o cardápio do dia ou fale com a gente pelo WhatsApp.
            </p>
          </div>
        ) : (
          <ProductGridPhoto products={preorderProducts} orderContext="preorder" />
        )}
      </section>
    </div>
  );
}
