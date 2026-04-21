import { cn } from "@/lib/utils";

type HeroPromoProps = {
  className?: string;
};

/**
 * Banner promocional do dashboard — bloco verde oliva com CTA "Resgatar".
 * Estrutura: chip "tempo limitado" + headline editorial (serif itálica)
 * + parágrafo curto + botão, com ilustração ampla ocupando a direita.
 */
export function HeroPromo({ className }: HeroPromoProps) {
  return (
    <section
      aria-label="Promoção em destaque"
      className={cn(
        "relative overflow-hidden rounded-lg bg-olive-900 text-paper-50 shadow-lg",
        className,
      )}
    >
      <div className="relative z-10 flex min-h-[160px] flex-col justify-between gap-3 px-5 py-5 md:min-h-[180px] md:max-w-[62%] md:px-7 md:py-6">
        <span className="inline-flex w-fit items-center gap-2 rounded-pill bg-paper-50/95 px-2.5 py-0.5 text-[11px] font-semibold text-olive-900">
          <span className="h-1.5 w-1.5 rounded-full bg-terra-500" />
          Tempo limitado
        </span>

        <div>
          <h2 className="font-serif text-h2 leading-tight text-paper-50 italic md:text-h1">
            Primeiro pedido com <span className="text-terra-500">20% off</span>
          </h2>
          <p className="mt-1.5 max-w-md text-[12px] text-paper-50/80 md:text-body-sm">
            Doce feito em casa, entregue no mesmo dia em BH. Válido em todo o cardápio.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-pill bg-paper-50 px-4 text-body-sm font-semibold text-olive-900 transition-colors hover:bg-terra-500 hover:text-paper-50"
          >
            Resgatar oferta
          </button>
          <p className="text-[11px] text-paper-50/70">
            Cupom <span className="font-semibold text-terra-500">VEGANA20</span>
          </p>
        </div>
      </div>

      <HeroIllustration />
    </section>
  );
}

function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 420 280"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="pointer-events-none absolute top-0 right-0 hidden h-full w-[55%] md:block"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="hero-glow" cx="0.7" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#de6e27" stopOpacity="0.35" />
          <stop offset="1" stopColor="#de6e27" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hero-pot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbf8ef" />
          <stop offset="1" stopColor="#e5e2d9" />
        </linearGradient>
      </defs>
      <rect width="420" height="280" fill="url(#hero-glow)" />

      <g transform="translate(210 50)">
        <ellipse cx="110" cy="210" rx="120" ry="14" fill="#000" opacity="0.18" />
        <path
          d="M 40 35 L 180 35 L 170 200 Q 110 220 50 200 Z"
          fill="url(#hero-pot)"
          stroke="#b4551d"
          strokeWidth="1.5"
        />
        <rect x="40" y="28" width="140" height="16" rx="4" fill="#b4551d" />
        <path d="M 52 60 Q 110 75 168 60 L 166 80 Q 110 95 54 80 Z" fill="#3c4221" opacity="0.92" />
        <path
          d="M 52 95 Q 110 108 168 95 L 166 115 Q 110 128 54 115 Z"
          fill="#de6e27"
          opacity="0.92"
        />
        <path
          d="M 52 130 Q 110 143 168 130 L 166 150 Q 110 163 54 150 Z"
          fill="#3c4221"
          opacity="0.92"
        />
        <path
          d="M 52 165 Q 110 178 168 165 L 166 185 Q 110 198 54 185 Z"
          fill="#de6e27"
          opacity="0.92"
        />
        <circle cx="80" cy="22" r="4" fill="#de6e27" />
        <circle cx="110" cy="18" r="5" fill="#fbf8ef" stroke="#b4551d" strokeWidth="1.5" />
        <circle cx="142" cy="22" r="4" fill="#de6e27" />
      </g>

      <g transform="translate(60 120)" opacity="0.95">
        <circle cx="30" cy="60" r="28" fill="#b4551d" />
        <circle cx="22" cy="55" r="4" fill="#fbf8ef" opacity="0.4" />
      </g>
      <g transform="translate(118 170)" opacity="0.9">
        <circle cx="20" cy="40" r="18" fill="#de6e27" />
        <circle cx="16" cy="36" r="3" fill="#fbf8ef" opacity="0.5" />
      </g>
    </svg>
  );
}
