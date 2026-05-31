import { Star } from "lucide-react";

/**
 * Bloco de marca das telas de auth (/login e /cadastro).
 *
 * Renderizado SOBRE a foto fullscreen do layout (auth), ao lado do card.
 * Texto claro (paper-50) sobre o overlay olive escuro. Reaproveita o equity
 * do hero da home: selo de prova social (4.9 · iFood), tagline e perks.
 *
 * Server-safe: sem hooks. Copy alinhada ao Brand Voice (afetivo, concreto).
 */

const TAGLINE = "Doce feito em casa.";
const SUBTITLE = "Sem lactose, feito à mão em Belo Horizonte.";
const BADGE = "4.9 · 420 pedidos no iFood";
const PERKS = ["Sem lactose", "100% vegano", "Entrega no mesmo dia"];

// ── Selo de prova social ──────────────────────────────────────────────────────

export function SocialBadge() {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-paper-50/15 px-3 py-1 text-caption font-semibold text-paper-50 ring-1 ring-paper-50/20 backdrop-blur-sm ring-inset">
      <Star className="h-3 w-3 fill-current" aria-hidden="true" />
      {BADGE}
    </span>
  );
}

// ── Aside de marca (sobre a foto, ao lado do card) ────────────────────────────

export function AuthBrandAside() {
  return (
    <aside className="hidden max-w-md flex-col gap-5 lg:flex">
      <SocialBadge />
      <div className="flex flex-col gap-2">
        <p className="text-display font-bold text-balance text-paper-50">{TAGLINE}</p>
        <p className="max-w-sm text-body-lg text-balance text-paper-50/85">{SUBTITLE}</p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {PERKS.map((perk) => (
          <li key={perk} className="flex items-center gap-2 text-body-sm text-paper-50/90">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-leaf-500" />
            {perk}
          </li>
        ))}
      </ul>
    </aside>
  );
}
