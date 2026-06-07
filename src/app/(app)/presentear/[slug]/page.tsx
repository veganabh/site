import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ArrowRight, Package, MessageCircle, MapPin } from "lucide-react";
import { getGiftKitBySlug } from "@/server/gift-kits";
import { KitCoverPhoto } from "@/components/gift/kit-cover-photo";
import { KitIcon } from "@/components/gift/kit-icon";
import { ViewContentTracker } from "@/components/providers/view-content-tracker";
import { formatBRL } from "@/lib/format";
import { Card } from "@/components/ui/card";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const kit = await getGiftKitBySlug(slug);
  if (!kit) return { title: "Kit — Veg.ana" };
  return {
    title: `${kit.name} — Veg.ana`,
    description: kit.tagline,
  };
}

export default async function KitDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const kit = await getGiftKitBySlug(slug);
  if (!kit) notFound();

  const totalItems = kit.slots.reduce((acc, s) => acc + s.qty, 0);
  const savingsVsIfood = kit.priceIfoodAnchor - kit.price;

  return (
    <div className="flex flex-col gap-5">
      <ViewContentTracker productId={kit.id} name={kit.name} price={kit.price} />
      <Link
        href="/presentear"
        className="inline-flex w-fit items-center gap-1 text-caption font-semibold text-olive-700 transition-colors hover:text-olive-900"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Voltar pra presentear
      </Link>

      <div className="grid gap-5 md:grid-cols-[5fr_4fr] md:items-start">
        <section aria-label="Foto do kit" className="flex flex-col gap-3">
          <div className="relative aspect-[5/4] overflow-hidden rounded-sm bg-paper-100 shadow-sm">
            <KitCoverPhoto photo={kit.coverPhoto} priority />
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-paper-50/95 px-2.5 py-1 text-micro font-bold text-olive-900 shadow-sm backdrop-blur-sm">
              <KitIcon name={kit.iconName} className="h-3 w-3 text-terra-700" aria-hidden="true" />
              Kit de Presente
            </span>
          </div>
        </section>

        <section aria-labelledby="kit-info-titulo" className="flex flex-col gap-4">
          <header className="flex flex-col gap-1.5">
            <h1
              id="kit-info-titulo"
              className="text-h3 leading-tight font-extrabold text-olive-900 md:text-h2"
            >
              {kit.name}
            </h1>
            <p className="text-body-sm text-olive-700">{kit.tagline}</p>
          </header>

          <p className="text-body-sm leading-relaxed text-olive-900">{kit.description}</p>

          <Card aria-label="Preço do kit" padding="none" className="flex items-end gap-3 p-4">
            <div className="flex flex-col leading-none">
              <span className="text-micro font-semibold tracking-wide text-olive-700 uppercase">
                Kit montado
              </span>
              <span className="mt-1 text-h2 font-extrabold text-olive-900">
                {formatBRL(kit.price)}
              </span>
            </div>
            {savingsVsIfood > 0 && (
              <div className="ml-auto flex flex-col items-end leading-none">
                <span className="text-micro text-olive-700 line-through">
                  iFood {formatBRL(kit.priceIfoodAnchor)}
                </span>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-leaf-500/10 px-2 py-0.5 text-micro font-semibold text-leaf-700">
                  economize {formatBRL(savingsVsIfood)}
                </span>
              </div>
            )}
          </Card>

          <Card
            as="section"
            aria-labelledby="kit-slots-titulo"
            padding="none"
            className="flex flex-col gap-2 p-4"
          >
            <h2 id="kit-slots-titulo" className="text-body-sm font-bold text-olive-900">
              O que vem no kit
            </h2>
            <ul className="flex flex-col gap-1.5">
              {kit.slots.map((s) => (
                <li key={s.id} className="flex items-start gap-2 text-caption text-olive-900">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-300/40 text-micro font-bold text-olive-900">
                    {s.qty}
                  </span>
                  <span className="leading-snug">
                    {s.label.replace(/^Escolha (\d+ )?/i, "").replace(/^/, (c) => c.toUpperCase())}
                    {s.helper && (
                      <span className="block text-micro text-olive-700">{s.helper}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-micro text-olive-700">
              Total: {totalItems} itens · você escolhe cada sabor no próximo passo.
            </p>
          </Card>

          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-micro text-olive-700">
            <li className="inline-flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-terra-500" aria-hidden="true" />
              embalagem opcional
            </li>
            <li className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5 text-terra-500" aria-hidden="true" />
              cartão com mensagem
            </li>
            <li className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-terra-500" aria-hidden="true" />
              entrega em outro endereço
            </li>
          </ul>

          <Link
            href={`/presentear/${kit.slug}/montar`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-terra-500 px-6 text-body-sm font-bold text-paper-50 shadow-sm transition-transform active:scale-[0.98]"
          >
            Montar esse kit
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}
