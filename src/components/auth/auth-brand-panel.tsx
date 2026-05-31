import Image from "next/image";
import { Star } from "lucide-react";

/**
 * Painel de marca das telas de auth (/login e /cadastro).
 *
 * Reaproveita o equity visual do hero da home: foto real de produto sobre
 * fundo olive com gradiente, selo de prova social (4.9 · iFood) e tagline.
 * Dois formatos:
 * - `AuthBrandPanel`  → coluna vertical no desktop (split-screen, ≥lg).
 * - `AuthBrandBanner` → faixa horizontal no mobile, pra não perder o calor.
 *
 * Server-safe: sem hooks. Copy alinhada ao Brand Voice (afetivo, concreto).
 */

const PHOTO_SRC = "/produtos/bolo-cenoura-brigadeiro.png";
const PHOTO_ALT = "Bolo de cenoura com cobertura de brigadeiro da Veg.ana, sobre a mesa";
const TAGLINE = "Doce feito em casa.";
const SUBTITLE = "Sem lactose, feito à mão em Belo Horizonte.";
const BADGE = "4.9 · 420 pedidos no iFood";
const PERKS = ["Sem lactose", "100% vegano", "Entrega no mesmo dia"];

// ── Selo de prova social ──────────────────────────────────────────────────────

function SocialBadge() {
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-paper-50/15 px-2.5 py-1 text-caption font-semibold text-paper-50 backdrop-blur-sm">
      <Star className="h-3 w-3 fill-current" aria-hidden="true" />
      {BADGE}
    </span>
  );
}

// ── Painel desktop (vertical, split-screen) ───────────────────────────────────

export function AuthBrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-olive-900 lg:flex lg:w-1/2 lg:flex-col xl:w-[55%]">
      <Image
        src={PHOTO_SRC}
        alt={PHOTO_ALT}
        fill
        sizes="(min-width: 1280px) 55vw, 50vw"
        className="object-cover"
        priority
      />
      {/* Gradiente: escuro embaixo pra legibilidade do texto, suave no topo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-olive-900/95 via-olive-900/55 to-olive-900/25"
      />
      <div className="relative mt-auto flex flex-col gap-4 p-10 xl:p-12">
        <SocialBadge />
        <div className="flex flex-col gap-2">
          <h2 className="text-display font-bold text-balance text-paper-50">{TAGLINE}</h2>
          <p className="max-w-sm text-body text-balance text-paper-50/85">{SUBTITLE}</p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-1.5 text-body-sm text-paper-50/90">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-leaf-500" />
              {perk}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

// ── Banner mobile (faixa horizontal) ──────────────────────────────────────────

export function AuthBrandBanner() {
  return (
    <div className="relative mb-1 h-28 overflow-hidden rounded-sm bg-olive-900 lg:hidden">
      <Image src={PHOTO_SRC} alt={PHOTO_ALT} fill sizes="100vw" className="object-cover" priority />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-olive-900/95 via-olive-900/50 to-olive-900/20"
      />
      <div className="relative flex h-full flex-col justify-end gap-1.5 p-4">
        <SocialBadge />
        <h2 className="text-h3 font-bold text-balance text-paper-50">{TAGLINE}</h2>
      </div>
    </div>
  );
}
