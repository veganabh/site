import Image from "next/image";
import { Star, Truck, Heart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type HeroPromoProps = {
  className?: string;
};

/**
 * Hero editorial da home — manifesto premium acessível.
 * Tagline "Doce feito em casa" do Brand Voice Guide §6.6.
 * Prova social inline (4.9 iFood · 420 pedidos) substitui banner de cupom.
 */
export function HeroPromo({ className }: HeroPromoProps) {
  return (
    <section
      aria-label="Doce feito em casa em Belo Horizonte"
      className={cn(
        "relative flex min-h-[216px] flex-col justify-center overflow-hidden rounded-sm bg-olive-900 p-5 text-paper-50 shadow-lg md:min-h-[244px] md:p-8",
        className,
      )}
    >
      <Image
        src="/banner-home.webp"
        alt=""
        fill
        priority
        sizes="(max-width: 768px) 100vw, 1300px"
        className="object-cover object-right"
      />
      {/* Overlay olive: forte na esquerda (texto legível) → leve na direita (foto aparece) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-olive-900 via-olive-900/80 to-olive-900/30"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-terra-500/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-3">
        <span
          className="inline-flex w-fit items-center gap-1.5 rounded-full bg-paper-50/10 px-2.5 py-1 text-micro font-medium text-paper-50 ring-1 ring-paper-50/15 ring-inset"
          aria-label="Avaliação 4.9 no iFood com mais de 420 pedidos"
        >
          <Star
            className="h-3 w-3 fill-terra-500 text-terra-500"
            aria-hidden="true"
            strokeWidth={0}
          />
          <span className="font-semibold text-paper-50">4.9</span>
          <span className="text-paper-50">·</span>
          <span>420 pedidos no iFood</span>
        </span>

        <div>
          <h1 className="text-h2 leading-tight font-extrabold text-paper-50 md:text-h1">
            Doce feito em casa.
          </h1>
          <p className="mt-2 max-w-xl text-body-sm text-paper-50 md:text-body-sm">
            Sem lactose, feito à mão em Belo Horizonte. Bolos, brigadeiros e palha italiana.
          </p>
        </div>

        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-caption text-paper-50">
          <li className="inline-flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-terra-500" aria-hidden="true" />
            entrega no mesmo dia
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-terra-500" aria-hidden="true" />
            sem lactose, 100% vegano
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-terra-500" aria-hidden="true" />
            feito à mão, todo dia
          </li>
        </ul>
      </div>
    </section>
  );
}
