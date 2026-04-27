/**
 * /gestao/modulos — Hub com acesso direto a todos os módulos de gestão.
 *
 * Mantido como fallback útil: acessível via link no rodapé da sidebar
 * ou deep link direto. Preserva o código original do hub de 9 cards.
 *
 * Migrado de /gestao/page.tsx (Passo 5) — o dashboard operacional
 * substituiu esta view como home da área admin.
 */

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
  MapPin,
} from "lucide-react";
import { listProducts } from "@/server/products";
import { listAllRings } from "@/server/rings";
import { listAdminCoupons } from "@/server/coupons";
import { listAllOrders } from "@/server/orders";

export const metadata: Metadata = {
  title: "Módulos — Gestão Veg.ana",
  description: "Vista completa dos módulos do painel de gestão Vegana BH.",
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

function buildCards(opts: {
  activeProducts: number;
  lowStock: number;
  activeRingsCount: number;
  maxKm: number;
  couponsCount: number;
  newOrdersCount: number;
  inProgressOrdersCount: number;
}): GestaoCard[] {
  return [
  {
    icon: Package,
    title: "Cardápio",
    description: "Gerir produtos, preços de venda e fotos do cardápio.",
    href: "/gestao/cardapio",
    stat: `${opts.activeProducts} produtos ativos`,
    statSecondary: opts.lowStock > 0 ? `${opts.lowStock} com estoque baixo` : undefined,
    phase: "disponível",
  },
  {
    icon: Tag,
    title: "Cupons",
    description: "Criar, desativar e medir o uso de cupons de desconto.",
    href: "/gestao/cupons",
    stat: `${opts.couponsCount} cupons cadastrados`,
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
    description: "Kanban dos pedidos do site — aceitar, preparar, chamar entregador.",
    href: "/gestao/pedidos",
    stat: `${opts.inProgressOrdersCount} em andamento`,
    statSecondary:
      opts.newOrdersCount > 0 ? `${opts.newOrdersCount} novo(s) esperando aceite` : undefined,
    phase: "disponível",
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
    title: "Kits de presente",
    description: "Criar, editar e ativar templates de kits — individual, família ou anfitriã.",
    href: "/gestao/kits",
    phase: "disponível",
  },
  {
    icon: BarChart2,
    title: "Relatórios",
    description: "Faturamento, margem e leitura dos relatórios do iFood.",
    href: "/gestao/relatorios",
    phase: "em construção",
  },
  {
    icon: MapPin,
    title: "Zonas de Entrega",
    description: "Raio de atendimento, taxa e tempo estimado por região.",
    href: "/gestao/zonas",
    stat: `${opts.activeRingsCount} anéis ativos (até ${opts.maxKm} km)`,
    phase: "disponível",
  },
  {
    icon: SlidersHorizontal,
    title: "Configurações",
    description: "Status da loja, horário de funcionamento e impressora.",
    href: "/gestao/configuracoes",
    phase: "disponível",
  },
  ];
}

const PHASE_LABELS: Record<NonNullable<GestaoCard["phase"]>, string> = {
  disponível: "Disponível",
  "em construção": "Em construção",
  "fase 4": "Fase 4",
};

const PHASE_CLASSES: Record<NonNullable<GestaoCard["phase"]>, string> = {
  disponível: "bg-leaf-500/10 text-leaf-500",
  "em construção": "bg-paper-100 text-olive-700",
  "fase 4": "bg-terra-500/10 text-terra-700",
};

export default async function ModulosPage() {
  const [products, rings, coupons, orders] = await Promise.all([
    listProducts({ onlyActive: false }),
    listAllRings(),
    listAdminCoupons(),
    listAllOrders(),
  ]);
  const activeProducts = products.filter((p) => p.active).length;
  const lowStock = products.filter(
    (p) => p.stock > 0 && p.stock <= p.lowStockThreshold,
  ).length;
  const activeRingsCount = rings.filter((r) => r.active).length;
  const maxKm =
    Math.max(...rings.filter((r) => r.active).map((r) => r.outerRadiusM), 0) / 1000;
  const newOrdersCount = orders.filter((o) => o.status === "NOVO").length;
  const inProgressOrdersCount = orders.filter(
    (o) => o.status === "PREPARANDO" || o.status === "PRONTO" || o.status === "A_CAMINHO",
  ).length;
  const cards = buildCards({
    activeProducts,
    lowStock,
    activeRingsCount,
    maxKm,
    couponsCount: coupons.length,
    newOrdersCount,
    inProgressOrdersCount,
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 font-bold text-olive-900">Módulos</h1>
        <p className="text-body-lg text-olive-700 italic">Vista completa do painel de gestão.</p>
      </div>

      {/* Grid de módulos */}
      <section aria-labelledby="modulos-gestao">
        <h2 id="modulos-gestao" className="sr-only">
          Módulos de gestão
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
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
                    className={`shrink-0 rounded-pill px-2.5 py-1 text-caption font-bold tracking-wide uppercase ${PHASE_CLASSES[phase]}`}
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

                {/* Stat secundária */}
                {card.statSecondary && (
                  <p className="text-caption font-semibold text-terra-700">{card.statSecondary}</p>
                )}

                {/* CTA */}
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
