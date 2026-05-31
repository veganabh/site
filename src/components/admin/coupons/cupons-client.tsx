"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Plus, Tag, Pencil, Trash2, ToggleLeft, ToggleRight, Search, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Coupon, CouponType } from "@/types/coupon";
import { useAdminCouponsStore } from "@/stores/admin-coupons-store";
import { computeCouponStatus } from "@/lib/coupon-status";
import { isExhaustedByUses } from "@/lib/coupons-metrics";
import { CouponFormDialog } from "@/components/admin/coupons/coupon-form-dialog";
import { CouponDeleteDialog } from "@/components/admin/coupons/coupon-delete-dialog";
import { CouponsStatsStrip } from "@/components/admin/coupons/coupons-stats-strip";
import { softDeleteCouponAction, toggleCouponStatusAction } from "@/server/actions/coupons";

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

function effectiveStatus(coupon: Coupon): "ATIVO" | "INATIVO" | "EXPIRADO" | "ESGOTADO" {
  const base = computeCouponStatus(coupon);
  if (base !== "EXPIRADO") return base;
  if (isExhaustedByUses(coupon)) return "ESGOTADO";
  return "EXPIRADO";
}

// ── Toast ──────────────────────────────────────────────────────────────────────

type ToastState =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function useToast() {
  const [state, setState] = useState<ToastState>({ kind: "idle" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: Exclude<ToastState, { kind: "idle" }>) => {
    setState(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setState({ kind: "idle" }), 2500);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { state, show };
}

// ── Componente principal ──────────────────────────────────────────────────────

export function CuponsClient() {
  const coupons = useAdminCouponsStore((s) => s.coupons);
  const setCoupons = useAdminCouponsStore((s) => s.setCoupons);
  const applyOptimisticUpdate = useAdminCouponsStore((s) => s.applyOptimisticUpdate);
  const applyOptimisticRemove = useAdminCouponsStore((s) => s.applyOptimisticRemove);
  const [, startTransition] = useTransition();
  const toast = useToast();

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
    if (!deletingCoupon) return;
    const target = deletingCoupon;
    const snapshot = useAdminCouponsStore.getState().coupons;
    setDeletingCoupon(null);
    applyOptimisticRemove(target.id);

    startTransition(async () => {
      const result = await softDeleteCouponAction(target.id);
      if (!result.ok) {
        setCoupons(snapshot);
        toast.show({ kind: "error", message: result.message });
        return;
      }
      toast.show({ kind: "success", message: `Cupom ${target.code} excluído.` });
    });
  }

  function handleDeleteCancel() {
    setDeletingCoupon(null);
  }

  function handleToggle(coupon: Coupon) {
    const status = effectiveStatus(coupon);
    if (status === "EXPIRADO" || status === "ESGOTADO") return;

    const nextStatus = coupon.status === "ATIVO" ? "INATIVO" : "ATIVO";
    const snapshot = useAdminCouponsStore.getState().coupons;
    applyOptimisticUpdate(coupon.id, { status: nextStatus });

    startTransition(async () => {
      const result = await toggleCouponStatusAction(coupon.id);
      if (!result.ok) {
        setCoupons(snapshot);
        toast.show({ kind: "error", message: result.message });
        return;
      }
      toast.show({
        kind: "success",
        message: `Cupom ${coupon.code} ${nextStatus === "ATIVO" ? "ativado" : "desativado"}.`,
      });
    });
  }

  return (
    <div className="relative flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2 font-bold text-olive-900">Cupons</h1>
        <Button variant="primary" size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo cupom
        </Button>
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
            "h-8 w-full rounded-sm border border-divider bg-paper-50 pr-8 pl-8",
            "text-caption text-olive-900 placeholder:text-olive-700",
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
          <Card padding="none" className="hidden overflow-x-auto md:block">
            <table role="table" className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-divider">
                  {["Código", "Tipo", "Desconto", "Usos", "Validade", "Status", "Ações"].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-3 py-2 text-caption font-semibold tracking-wide text-olive-700 uppercase"
                      >
                        {col === "Ações" ? <span className="sr-only">Ações</span> : col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map((coupon) => {
                  const status = effectiveStatus(coupon);
                  const isLocked = status === "EXPIRADO" || status === "ESGOTADO";

                  return (
                    <tr
                      key={coupon.id}
                      className="border-b border-divider transition-colors last:border-0 hover:bg-paper-100/50"
                    >
                      <td className="px-3 py-2">
                        <code className="rounded-sm bg-paper-100 px-1.5 py-0 font-mono text-micro text-olive-900">
                          {coupon.code}
                        </code>
                        {coupon.eligibility === "FIRST_PURCHASE" && (
                          <span className="mt-1 flex w-fit items-center rounded-full bg-terra-500/15 px-1.5 py-0 text-micro font-semibold text-terra-700">
                            1ª compra
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-1.5 py-0 text-micro leading-4 font-semibold",
                            TYPE_BADGE[coupon.type],
                          )}
                        >
                          {TYPE_LABEL[coupon.type]}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-caption font-semibold text-olive-900">
                        {formatDiscount(coupon)}
                      </td>

                      <td className="px-3 py-2 text-caption text-olive-700 tabular-nums">
                        {formatUses(coupon)}
                      </td>

                      <td className="px-3 py-2 text-caption text-olive-700">
                        {formatDate(coupon.validUntil)}
                      </td>

                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-1.5 py-0 text-micro leading-4 font-semibold",
                            STATUS_BADGE[status],
                          )}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(coupon)}
                            aria-label={`Editar cupom ${coupon.code}`}
                            className="relative flex h-7 w-7 items-center justify-center rounded-sm text-olive-700 transition before:absolute before:-inset-2 before:content-[''] hover:bg-paper-100 hover:text-olive-900"
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
                            className="relative flex h-7 w-7 items-center justify-center rounded-sm text-olive-700 transition before:absolute before:-inset-2 before:content-[''] hover:bg-paper-100 hover:text-olive-900 disabled:cursor-not-allowed disabled:opacity-40"
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

                          <button
                            type="button"
                            onClick={() => handleDeleteRequest(coupon)}
                            aria-label={`Excluir cupom ${coupon.code}`}
                            className="relative flex h-7 w-7 items-center justify-center rounded-sm text-olive-700 transition before:absolute before:-inset-2 before:content-[''] hover:bg-terra-500/10 hover:text-terra-700"
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
          </Card>

          {/* Cards — mobile (<md) */}
          <div className="flex flex-col gap-2 md:hidden">
            {filteredCoupons.map((coupon) => {
              const status = effectiveStatus(coupon);
              const isLocked = status === "EXPIRADO" || status === "ESGOTADO";

              return (
                <Card key={coupon.id} padding="sm" className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <code className="rounded-sm bg-paper-100 px-1.5 py-0 font-mono text-micro text-olive-900">
                        {coupon.code}
                      </code>
                      {coupon.eligibility === "FIRST_PURCHASE" && (
                        <span className="inline-flex items-center rounded-full bg-terra-500/15 px-1.5 py-0 text-micro font-semibold text-terra-700">
                          1ª compra
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-1.5 py-0 text-micro leading-4 font-semibold",
                        STATUS_BADGE[status],
                      )}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-1.5 py-0 text-micro leading-4 font-semibold",
                        TYPE_BADGE[coupon.type],
                      )}
                    >
                      {TYPE_LABEL[coupon.type]}
                    </span>
                    <span className="text-caption font-semibold text-olive-900">
                      {formatDiscount(coupon)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-micro text-olive-700">
                    <span>Usos: {formatUses(coupon)}</span>
                    <span>Até: {formatDate(coupon.validUntil)}</span>
                  </div>

                  <div className="flex gap-2 border-t border-divider pt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(coupon)}
                      aria-label={`Editar cupom ${coupon.code}`}
                      className="relative flex h-7 w-7 items-center justify-center rounded-sm text-olive-700 transition before:absolute before:-inset-2 before:content-[''] hover:bg-paper-100 hover:text-olive-900"
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
                      className="relative flex h-7 w-7 items-center justify-center rounded-sm text-olive-700 transition before:absolute before:-inset-2 before:content-[''] hover:bg-paper-100 hover:text-olive-900 disabled:cursor-not-allowed disabled:opacity-40"
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
                      className="relative flex h-7 w-7 items-center justify-center rounded-sm text-olive-700 transition before:absolute before:-inset-2 before:content-[''] hover:bg-terra-500/10 hover:text-terra-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.75} />
                    </button>
                  </div>
                </Card>
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
        onSuccess={(message) => toast.show({ kind: "success", message })}
        onError={(message) => toast.show({ kind: "error", message })}
      />

      <CouponDeleteDialog
        coupon={deletingCoupon}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {/* Toast */}
      <div
        role={toast.state.kind === "error" ? "alert" : "status"}
        aria-live="polite"
        aria-atomic="true"
        className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-body-sm font-semibold shadow-md transition-all duration-300 ${
          toast.state.kind === "error" ? "bg-terra-700 text-paper-50" : "bg-olive-900 text-paper-50"
        } ${toast.state.kind === "idle" ? "pointer-events-none translate-y-2 opacity-0" : "translate-y-0 opacity-100"}`}
      >
        {toast.state.kind === "idle" ? "" : toast.state.message}
      </div>
    </div>
  );
}
