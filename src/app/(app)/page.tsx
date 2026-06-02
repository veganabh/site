import type { Metadata } from "next";
import { listProducts } from "@/server/products";
import { HeroPromo } from "@/components/dashboard/hero-promo";
import { DeliveryGate } from "@/components/dashboard/delivery-gate";
import { CategoryCircles } from "@/components/dashboard/category-circles";
import { ProductGridPhoto } from "@/components/dashboard/product-grid-photo";
import { getCollectionBySlug } from "@/server/collections";

export const metadata: Metadata = {
  title: "Veg.ana — doces sem lactose em BH",
  description:
    "Doce feito em casa, sem lactose, feito à mão em Belo Horizonte. Bolo no pote, palha italiana, bombons e mais.",
};

type HomeProps = {
  searchParams: Promise<{ cat?: string; col?: string; q?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { cat, col, q } = await searchParams;
  // Categoria é slug dinâmico (tabela `categories`) — aceita qualquer valor.
  // Filtro é eq parametrizado no Supabase; slug inexistente só retorna vazio.
  const category = cat?.trim() || undefined;
  const collection = col ? await getCollectionBySlug(col) : null;
  const query = q?.trim() || undefined;

  const products = await listProducts({
    category,
    collection: collection?.slug,
    query,
  });

  // Visibilidade do cardápio (Modelo A): produto ativo aparece se tem estoque
  // OU aceita encomenda. Esgotado + não-apto some (não dá pra comprar nem
  // encomendar). listProducts já filtra ativo + não-deletado.
  const visibleProducts = products.filter((p) => p.stock > 0 || p.availableForPreorder);

  const active = collection ? collection.slug : (category ?? "all");
  const headerLabel = query
    ? `Resultados para "${query}"`
    : collection
      ? collection.name
      : "Cardápio";

  return (
    <div className="flex flex-col gap-4">
      <HeroPromo />

      <section aria-labelledby="categorias" className="flex flex-col gap-2">
        <h2 id="categorias" className="text-h3 font-bold text-olive-900">
          Categorias
        </h2>
        <div className="flex items-stretch gap-3">
          <CategoryCircles active={active} basePath="/" className="min-w-0 flex-1" />
          <DeliveryGate variant="card" className="hidden w-[300px] shrink-0 md:flex" />
        </div>
      </section>

      <div className="md:hidden">
        <DeliveryGate />
      </div>

      <section aria-labelledby="cardapio" className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between md:gap-3">
          <div>
            <h2 id="cardapio" className="text-h3 font-bold text-olive-900">
              {headerLabel}
            </h2>
            {collection?.tagline && (
              <p className="mt-0.5 text-caption text-olive-700">{collection.tagline}</p>
            )}
          </div>
          <p className="inline-flex items-center gap-1.5 text-micro text-olive-700">
            <span className="h-1.5 w-1.5 rounded-full bg-leaf-500" aria-hidden="true" />
            {visibleProducts.length} {visibleProducts.length === 1 ? "item" : "itens"} · sem
            lactose, vegano
          </p>
        </div>
        <ProductGridPhoto products={visibleProducts} />
      </section>
    </div>
  );
}
