"use client";

import { useMemo, useState } from "react";
import { Plus, Tag, Pencil, Trash2, ToggleLeft, ToggleRight, Search, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Coupon, CouponType } from "@/types/coupon";
import { useAdminCouponsStore } from "@/stores/admin-coupons-store";
import { computeCouponStatus } from "@/lib/mock-coupons-admin";
import { isExhaustedByUses } from "@/lib/coupons-metrics";
import { CouponFormDialog } from "@/components/admin/coupons/coupon-form-dialog";
import { CouponDeleteDialog } from "@/components/admin/coupons/coupon-delete-dialog";
import { CouponsStatsStrip } from "@/components/admin/coupons/coupons-stats-strip";

// ── Helpers de formatação ─────────────────────────────────────────────────────

function formatDiscount(coupon: Coupon): string {
  if (coupon.type === "FRETE_GRATIS") return "Frete grátis";
  if (coupon.type === "PERCENTUAL") return `−${coupon.value}%`;
  return `−R$ ${coupon.value.toFixed(2).replace(".", ",")}`;
}

function formatUses(coupon: Coupon): string {
  return `${coupon.usedCount} / ${coupon.maxUses ?? "∞"}`;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "Sem expiração";
  try {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
}

// ── Helpers de badge compacto (alinhado com /gestao/pedidos P0) ───────────────

const STATUS_BADGE: Record<string, string> = {
  ATIVO: "bg-leaf-500/15 text-leaf-700",
  INATIVO: "bg-paper-100 text-olive-700",
  EXPIRADO: "bg-terra-500/15 text-terra-700",
  ESGOTADO: "bg-warning/20 text-olive-900",
};

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  EXPIRADO: "Expirado",
  ESGOTADO: "Esgotado",
};

const TYPE_BADGE: Record<CouponType, string> = {
  PERCENTUAL: "bg-info/15 text-info",
  FIXO: "bg-olive-500/15 text-olive-700",
  FRETE_GRATIS: "bg-leaf-500/15 text-leaf-700",
};

const TYPE_LABEL: Record<CouponType, string> = {
  PERCENTUAL: "Percentual",
  FIXO: "Fixo",
  FRETE_GRATIS: "Frete grátis",
};

/**
 * Status "efetivo" para exibição — diferencia ESGOTADO (maxUses atingido)
 * de EXPIRADO (data passou). computeCouponStatus unifica em EXPIRADO;
 * aqui refinamos pra UX mais clara.
 */
function effectiveStatus(coupon: Coupon): "ATIVO" | "INATIVO" | "EXPIRADO" | "ESGOTADO" {
  const base = computeCouponStatus(coupon);
  if (base !== "EXPIRADO") return base;
  // Se computeCouponStatus marcou expirado E motivo é maxUses → ESGOTADO
  if (isExhaustedByUses(coupon)) return "ESGOTADO";
  return "EXPIRADO";
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CuponsPage() {
  const coupons = useAdminCouponsStore((s) => s.coupons);
  const store = useAdminCouponsStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);
  const [search, setSearch] = useState("");

  const filteredCoupons = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return coupons;
    return coupons.filter((c) => c.code.toLowerCase().includes(q));
  }, [coupons, search]);

  function handleOpenCreate() {
    setEditingCoupon(null);
    setFormOpen(true);
  }

  function handleOpenEdit(coupon: Coupon) {
    setEditingCoupon(coupon);
    setFormOpen(true);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditingCoupon(null);
  }

  function handleDeleteRequest(coupon: Coupon) {
    setDeletingCoupon(coupon);
  }

  function handleDeleteConfirm() {
    if (deletingCoupon) {
      store.delete(deletingCoupon.id);
    }
    setDeletingCoupon(null);
  }

  function handleDeleteCancel() {
    setDeletingCoupon(null);
  }

  function handleToggle(coupon: Coupon) {
    store.toggleStatus(coupon.id);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2 font-bold text-olive-900">Cupons</h1>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-olive-900 px-4 text-body-sm font-semibold text-paper-50 transition hover:bg-olive-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo cupom
        </button>
      </div>

      {/* Strip de métricas */}
      <CouponsStatsStrip coupons={coupons} />

      {/* Busca */}
      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-olive-700"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código"
          aria-label="Buscar cupom por código"
          className={cn(
            "h-8 w-full rounded-md border border-divider bg-paper-50 pr-8 pl-8",
            "text-caption text-olive-900 placeholder:text-olive-700/50",
            "focus:border-olive-900 focus:outline-none",
          )}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Limpar busca"
            className="absolute top-1/2 right-1.5 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-olive-700 hover:bg-paper-100"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Conteúdo */}
      {coupons.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-3 py-16 text-center text-olive-700">
          <Tag className="h-8 w-8 opacity-30" aria-hidden="true" />
          <p className="text-caption">Nenhum cupom ativo — crie o primeiro pra começar.</p>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-olive-700">
          <p className="text-caption">Nenhum cupom com esse código.</p>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-caption font-semibold text-olive-900 underline-offset-2 hover:underline"
          >
            Limpar busca
          </button>
        </div>
      ) : (
        <>
          {/* Tabela — desktop md+ */}
          <div className="hidden md:block">
            <table role="table" className="w-full text-caption">
              <thead>
                <tr className="border-b border-divider text-left">
                  <th className="pr-4 pb-2 text-[10px] font-bold tracking-wide text-olive-700 uppercase">
                    Código
                  </th>
                  <th className="pr-4 pb-2 text-[10px] font-bold tracking-wide text-olive-700 uppercase">
                    Tipo
                  </th>
                  <th className="pr-4 pb-2 text-[10px] font-bold tracking-wide text-olive-700 uppercase">
                    Desconto
                  </th>
                  <th className="pr-4 pb-2 text-[10px] font-bold tracking-wide text-olive-700 uppercase">
                    Usos
                  </th>
                  <th className="pr-4 pb-2 text-[10px] font-bold tracking-wide text-olive-700 uppercase">
                    Validade
                  </th>
                  <th className="pr-4 pb-2 text-[10px] font-bold tracking-wide text-olive-700 uppercase">
                    Status
                  </th>
                  <th className="pb-2 text-[10px] font-bold tracking-wide text-olive-700 uppercase">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map((coupon) => {
                  const status = effectiveStatus(coupon);
                  const isLocked = status === "EXPIRADO" || status === "ESGOTADO";

                  return (
                    <tr
                      key={coupon.id}
                      className="border-b border-divider last:border-0 hover:bg-paper-100/50"
                    >
                      {/* Código */}
                      <td className="py-2 pr-4">
                        <code className="rounded bg-paper-100 px-1.5 py-0 font-mono text-[10px] text-olive-900">
                          {coupon.code}
                        </code>
                      </td>

                      {/* Tipo */}
                      <td className="py-2 pr-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-pill px-1.5 py-0 text-[10px] leading-4 font-semibold",
                            TYPE_BADGE[coupon.type],
                          )}
                        >
                          {TYPE_LABEL[coupon.type]}
                        </span>
                      </td>

                      {/* Desconto */}
                      <td className="py-2 pr-4 font-semibold text-olive-900">
                        {formatDiscount(coupon)}
                      </td>

                      {/* Usos */}
                      <td className="py-2 pr-4 text-olive-700 tabular-nums">
                        {formatUses(coupon)}
                      </td>

                      {/* Validade */}
                      <td className="py-2 pr-4 text-olive-700">
                        {formatDate(coupon.validUntil)}
                      </td>

                      {/* Status */}
                      <td className="py-2 pr-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-pill px-1.5 py-0 text-[10px] leading-4 font-semibold",
                            STATUS_BADGE[status],
                          )}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-2">
                        <div className="flex items-center gap-1">
                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(coupon)}
                            aria-label={`Editar cupom ${coupon.code}`}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-olive-700 transition hover:bg-paper-100 hover:text-olive-900"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.75} />
                          </button>

                          {/* Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggle(coupon)}
                            disabled={isLocked}
                            aria-label={
                              isLocked
                                ? `Cupom ${coupon.code} ${STATUS_LABEL[status].toLowerCase()}`
                                : status === "ATIVO"
                                  ? `Desativar cupom ${coupon.code}`
                                  : `Ativar cupom ${coupon.code}`
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-md text-olive-700 transition hover:bg-paper-100 hover:text-olive-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {status === "ATIVO" ? (
                              <ToggleRight
                                className="h-4 w-4 text-leaf-700"
                                aria-hidden="true"
                                strokeWidth={1.75}
                              />
                            ) : (
                              <ToggleLeft
                                className="h-4 w-4"
                                aria-hidden="true"
                                strokeWidth={1.75}
                              />
                            )}
                          </button>

                          {/* Deletar */}
                          <button
                            type="button"
                            onClick={() => handleDeleteRequest(coupon)}
                            aria-label={`Excluir cupom ${coupon.code}`}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-olive-700 transition hover:bg-terra-500/10 hover:text-terra-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.75} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile (<md) */}
          <div className="flex flex-col gap-2 md:hidden">
            {filteredCoupons.map((coupon) => {
              const status = effectiveStatus(coupon);
              const isLocked = status === "EXPIRADO" || status === "ESGOTADO";

              return (
                <div
                  key={coupon.id}
                  className="flex flex-col gap-2 rounded-md border border-divider bg-paper-50 p-3"
                >
                  {/* Linha 1: código + status */}
                  <div className="flex items-center justify-between">
                    <code className="rounded bg-paper-100 px-1.5 py-0 font-mono text-[10px] text-olive-900">
                      {coupon.code}
                    </code>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-pill px-1.5 py-0 text-[10px] leading-4 font-semibold",
                        STATUS_BADGE[status],
                      )}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                  </div>

                  {/* Linha 2: tipo + desconto */}
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-pill px-1.5 py-0 text-[10px] leading-4 font-semibold",
                        TYPE_BADGE[coupon.type],
                      )}
                    >
                      {TYPE_LABEL[coupon.type]}
                    </span>
                    <span className="text-caption font-semibold text-olive-900">
                      {formatDiscount(coupon)}
                    </span>
                  </div>

                  {/* Linha 3: usos + validade */}
                  <div className="flex items-center justify-between text-[10px] text-olive-700">
                    <span>Usos: {formatUses(coupon)}</span>
                    <span>Até: {formatDate(coupon.validUntil)}</span>
                  </div>

                  {/* Linha 4: ações */}
                  <div className="flex gap-2 border-t border-divider pt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(coupon)}
                      aria-label={`Editar cupom ${coupon.code}`}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-olive-700 transition hover:bg-paper-100 hover:text-olive-900"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.75} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggle(coupon)}
                      disabled={isLocked}
                      aria-label={
                        isLocked
                          ? `Cupom ${coupon.code} ${STATUS_LABEL[status].toLowerCase()}`
                          : status === "ATIVO"
                            ? `Desativar cupom ${coupon.code}`
                            : `Ativar cupom ${coupon.code}`
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-md text-olive-700 transition hover:bg-paper-100 hover:text-olive-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {status === "ATIVO" ? (
                        <ToggleRight
                          className="h-4 w-4 text-leaf-700"
                          aria-hidden="true"
                          strokeWidth={1.75}
                        />
                      ) : (
                        <ToggleLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteRequest(coupon)}
                      aria-label={`Excluir cupom ${coupon.code}`}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-olive-700 transition hover:bg-terra-500/10 hover:text-terra-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modais */}
      <CouponFormDialog
        open={formOpen}
        coupon={editingCoupon ?? undefined}
        onClose={handleCloseForm}
      />

      <CouponDeleteDialog
        coupon={deletingCoupon}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
