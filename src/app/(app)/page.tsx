import type { Metadata } from "next";
import { listProducts } from "@/server/products";
import { HeroPromo } from "@/components/dashboard/hero-promo";
import { DeliveryGate } from "@/components/dashboard/delivery-gate";
import { CategoryCircles } from "@/components/dashboard/category-circles";
import { ProductGridPhoto } from "@/components/dashboard/product-grid-photo";
import { isProductCategory } from "@/lib/product-meta";
import { findCollectionBySlug } from "@/lib/mock-collections";

export const metadata: Metadata = {
  title: "Veg.ana — doces sem lactose em BH",
  description:
    "Doce feito em casa, sem lactose, feito à mão em Belo Horizonte. Bolo no pote, palha italiana, bombons e mais.",
};

type HomeProps = {
  searchParams: Promise<{ cat?: string; col?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { cat, col } = await searchParams;
  const category = isProductCategory(cat) ? cat : undefined;
  const collection = col ? findCollectionBySlug(col) : undefined;

  const products = await listProducts({
    category,
    collection: collection?.slug,
  });

  const active = collection ? collection.slug : (category ?? "all");
  const headerLabel = collection ? collection.name : "Cardápio";

  return (
    <div className="flex flex-col gap-4">
      <HeroPromo />

      <DeliveryGate />

      <section aria-labelledby="categorias" className="flex flex-col gap-2">
        <h2 id="categorias" className="text-h3 font-bold text-olive-900">
          Categorias
        </h2>
        <CategoryCircles active={active} basePath="/" />
      </section>

      <section aria-labelledby="cardapio" className="flex flex-col gap-2.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="cardapio" className="text-h3 font-bold text-olive-900">
              {headerLabel}
            </h2>
            {collection?.tagline && (
              <p className="mt-0.5 text-[12px] text-olive-700">{collection.tagline}</p>
            )}
          </div>
          <p className="inline-flex items-center gap-1.5 text-[11px] text-olive-700">
            <span className="h-1.5 w-1.5 rounded-full bg-leaf-500" aria-hidden="true" />
            {products.length} {products.length === 1 ? "item" : "itens"} · sem lactose, vegano
          </p>
        </div>
        <ProductGridPhoto products={products} />
      </section>
    </div>
  );
}
