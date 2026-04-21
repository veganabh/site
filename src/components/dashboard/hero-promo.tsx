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
        "relative overflow-hidden rounded-2xl bg-olive-900 p-5 text-paper-50 shadow-lg md:p-8",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-terra-500/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-terra-500/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-3">
        <span
          className="inline-flex w-fit items-center gap-1.5 rounded-pill bg-paper-50/10 px-2.5 py-1 text-[11px] font-medium text-paper-50/90 ring-1 ring-inset ring-paper-50/15"
          aria-label="Avaliação 4.9 no iFood com mais de 420 pedidos"
        >
          <Star
            className="h-3 w-3 fill-terra-500 text-terra-500"
            aria-hidden="true"
            strokeWidth={0}
          />
          <span className="font-semibold text-paper-50">4.9</span>
          <span className="text-paper-50/50">·</span>
          <span>420 pedidos no iFood</span>
        </span>

        <div>
          <h1 className="text-[28px] font-extrabold leading-tight text-paper-50 md:text-[40px]">
            Doce feito em casa.
          </h1>
          <p className="mt-2 max-w-xl text-[13px] text-paper-50/85 md:text-[14px]">
            Sem lactose, feito à mão em Belo Horizonte. Bolos, brigadeiros e
            palha italiana.
          </p>
        </div>

        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-paper-50/85">
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

        <div className="mt-2 flex items-center gap-3">
          <a
            href="#cardapio"
            className="inline-flex h-10 items-center rounded-pill bg-paper-50 px-5 text-body-sm font-semibold text-olive-900 transition-colors hover:bg-terra-500 hover:text-paper-50"
          >
            Ver cardápio
          </a>
        </div>
      </div>
    </section>
  );
}
