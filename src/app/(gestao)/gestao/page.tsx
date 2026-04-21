// Rota pública de propósito — sem auth até a migração formal (ver CLAUDE.md §7, item 4).
// Quando a área estiver completa, migrar para rota protegida com middleware Supabase.

import type { Metadata } from "next";
import {
  Package,
  Tag,
  GitBranch,
  ClipboardList,
  Sparkles,
  Gift,
  BarChart2,
  SlidersHorizontal,
} from "lucide-react";
import { AVAILABLE_COUPONS } from "@/lib/coupons";
import { mockProducts } from "@/lib/mock-products";

export const metadata: Metadata = {
  title: "Gestão — Veg.ana",
  description: "Painel interno da Vegana BH — gestão de cardápio, cupons, pedidos e mais.",
};

type GestaoCard = {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  stat?: string;
  statSecondary?: string;
  phase?: "disponível" | "em construção" | "fase 4";
};

const lowStock = mockProducts.filter(
  (p) => p.stock > 0 && p.stock <= p.lowStockThreshold,
).length;

const GESTAO_CARDS: GestaoCard[] = [
  {
    icon: Package,
    title: "Cardápio",
    description: "Gerir produtos, preços de venda e fotos do cardápio.",
    href: "/gestao/cardapio",
    stat: `${mockProducts.filter((p) => p.active).length} produtos ativos`,
    statSecondary: lowStock > 0 ? `${lowStock} com estoque baixo` : undefined,
    phase: "disponível",
  },
  {
    icon: Tag,
    title: "Cupons",
    description: "Criar, desativar e medir o uso de cupons de desconto.",
    href: "/gestao/cupons",
    stat: `${AVAILABLE_COUPONS.length} cupons cadastrados`,
    phase: "em construção",
  },
  {
    icon: GitBranch,
    title: "Cross-sell",
    description: "Editar faixas de economia e os itens sugeridos no carrinho.",
    href: "/gestao/cross-sell",
    phase: "em construção",
  },
  {
    icon: ClipboardList,
    title: "Pedidos",
    description: "Visão consolidada dos pedidos do iFood e do site próprio.",
    href: "/gestao/pedidos",
    phase: "em construção",
  },
  {
    icon: Sparkles,
    title: "Edições Especiais",
    description: "Cardápio rotativo mensal — criação e publicação de edições limitadas.",
    href: "/gestao/edicoes",
    phase: "fase 4",
  },
  {
    icon: Gift,
    title: "Kit Anfitriã",
    description: "Gerenciar os três tamanhos do kit para eventos e presentes.",
    href: "/gestao/kit-anfitria",
    phase: "fase 4",
  },
  {
    icon: BarChart2,
    title: "Relatórios",
    description: "Faturamento, margem e leitura dos relatórios do iFood.",
    href: "/gestao/relatorios",
    phase: "em construção",
  },
  {
    icon: SlidersHorizontal,
    title: "Configurações",
    description: "Horário de funcionamento, raio de entrega e frete.",
    href: "/gestao/configuracoes",
    phase: "em construção",
  },
];

const PHASE_LABELS: Record<NonNullable<GestaoCard["phase"]>, string> = {
  "disponível": "Disponível",
  "em construção": "Em construção",
  "fase 4": "Fase 4",
};

const PHASE_CLASSES: Record<NonNullable<GestaoCard["phase"]>, string> = {
  "disponível": "bg-leaf-500/10 text-leaf-500",
  "em construção": "bg-paper-100 text-olive-700",
  "fase 4": "bg-terra-500/10 text-terra-700",
};

export default function GestaoPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Banner discreto de pré-migração */}
      <aside
        role="note"
        className="rounded-md border border-divider bg-paper-100 px-4 py-3 text-body-sm text-olive-700"
      >
        Versão pré-migração — em breve esta área terá login próprio.
      </aside>

      {/* Header da área */}
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 font-bold text-olive-900">Gestão</h1>
        <p className="font-serif italic text-body-lg text-olive-700">
          Painel interno da Vegana BH.
        </p>
      </div>

      {/* Grid de módulos */}
      <section aria-labelledby="modulos-gestao">
        <h2 id="modulos-gestao" className="sr-only">
          Módulos de gestão
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {GESTAO_CARDS.map((card) => {
            const Icon = card.icon;
            const phase = card.phase ?? "disponível";
            const isUnavailable = phase !== "disponível";

            return (
              <div
                key={card.href}
                className="flex flex-col gap-3 rounded-lg border border-divider bg-paper-50 p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Ícone + título */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-paper-100"
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5 text-olive-900" strokeWidth={1.75} />
                    </span>
                    <h3 className="text-body font-semibold text-olive-900">{card.title}</h3>
                  </div>

                  {/* Badge de fase */}
                  <span
                    className={`shrink-0 rounded-pill px-2.5 py-1 text-caption font-bold uppercase tracking-wide ${PHASE_CLASSES[phase]}`}
                  >
                    {PHASE_LABELS[phase]}
                  </span>
                </div>

                {/* Descrição */}
                <p className="text-body-sm text-olive-700">{card.description}</p>

                {/* Stat primária */}
                {card.stat && (
                  <p className="text-caption font-semibold text-olive-900">{card.stat}</p>
                )}

                {/* Stat secundária — estoque baixo, em tom âmbar via terra-500 */}
                {card.statSecondary && (
                  <p className="text-caption font-semibold text-terra-700">
                    {card.statSecondary}
                  </p>
                )}

                {/* CTA desabilitado */}
                {isUnavailable ? (
                  <button
                    type="button"
                    disabled
                    aria-label={`${card.title} — em construção`}
                    className="mt-auto w-full cursor-not-allowed rounded-sm border border-divider bg-paper-100 py-2.5 text-cta text-olive-700 opacity-60"
                  >
                    Acessar
                  </button>
                ) : (
                  <a
                    href={card.href}
                    className="mt-auto block w-full rounded-sm bg-olive-900 py-2.5 text-center text-cta text-paper-50 transition hover:bg-olive-700"
                  >
                    Acessar
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
