"use client";

/**
 * Lista de notificações broadcast para o painel admin.
 *
 * Exibe tipo, título, audiência, janela de visibilidade e status (ativa/expirada).
 * Ações: editar (link) + excluir (com confirmação inline).
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Megaphone, Rocket, AlertCircle, BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { deleteNotificationAction } from "@/server/actions/notifications";
import type { Notification, NotificationType } from "@/types/notification";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<NotificationType, string> = {
  promo: "Promoção",
  launch: "Lançamento",
  operational: "Aviso",
  content: "Conteúdo",
};

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  promo: Megaphone,
  launch: Rocket,
  operational: AlertCircle,
  content: BookOpen,
};

const TYPE_CLASSES: Record<NotificationType, string> = {
  promo: "text-terra-500",
  launch: "text-leaf-500",
  operational: "text-olive-700",
  content: "text-olive-700",
};

function isActive(n: Notification): boolean {
  const now = new Date();
  return new Date(n.publishedAt) <= now && new Date(n.expiresAt) > now;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ── DeleteButton ──────────────────────────────────────────────────────────────

function DeleteButton({ id, title }: { id: string; title: string }) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        aria-label={`Excluir notificação "${title}"`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-olive-700 transition-colors hover:bg-terra-500/10 hover:text-terra-700"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-caption text-terra-700">Confirmar?</span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            await deleteNotificationAction(id);
            router.refresh();
          });
        }}
        className="inline-flex h-7 items-center rounded-pill bg-terra-500 px-3 text-[11px] font-semibold text-paper-50 transition-colors hover:bg-terra-700 disabled:opacity-50"
      >
        {isPending ? "Excluindo…" : "Sim"}
      </button>
      <button
        type="button"
        onClick={() => setConfirm(false)}
        className="inline-flex h-7 items-center rounded-pill border border-divider bg-paper-50 px-3 text-[11px] font-medium text-olive-700 transition-colors hover:bg-paper-100"
      >
        Não
      </button>
    </div>
  );
}

// ── NotificacoesListClient ────────────────────────────────────────────────────

type Props = {
  notifications: Notification[];
};

export function NotificacoesListClient({ notifications }: Props) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-divider bg-paper-50 py-16 text-center">
        <Megaphone className="h-10 w-10 text-olive-700/20" strokeWidth={1.25} />
        <p className="text-body-sm text-olive-700">Nenhuma notificação cadastrada.</p>
        <Link
          href="/gestao/notificacoes/nova"
          className="inline-flex h-9 items-center gap-2 rounded-pill bg-olive-900 px-4 text-[13px] font-semibold text-paper-50 transition-colors hover:bg-olive-700"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Criar a primeira
        </Link>
      </div>
    );
  }

  return (
    <div
      role="list"
      aria-label="Lista de notificações"
      className="flex flex-col divide-y divide-divider rounded-lg border border-divider bg-paper-50"
    >
      {notifications.map((n) => {
        const Icon = TYPE_ICONS[n.type];
        const active = isActive(n);

        return (
          <div
            key={n.id}
            role="listitem"
            className="flex items-start gap-4 px-4 py-3"
          >
            {/* Ícone tipo */}
            <span
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-divider bg-paper-100",
                TYPE_CLASSES[n.type],
              )}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>

            {/* Conteúdo */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold uppercase tracking-wide",
                    active
                      ? "bg-leaf-500/15 text-leaf-700"
                      : "bg-paper-100 text-olive-700/60",
                  )}
                >
                  {active ? "Ativa" : "Inativa"}
                </span>
                <span className="text-[11px] font-medium text-olive-700/70">
                  {TYPE_LABELS[n.type]}
                </span>
                <span className="text-[11px] text-olive-700/50">
                  {n.audience === "all" ? "Todos" : "Só logados"}
                </span>
              </div>

              <p className="mt-0.5 text-body-sm font-semibold text-olive-900 line-clamp-1">
                {n.title}
              </p>
              <p className="mt-0.5 text-caption text-olive-700 line-clamp-1">{n.body}</p>

              <p className="mt-1 text-[10px] text-olive-700/50">
                {formatDate(n.publishedAt)} → {formatDate(n.expiresAt)}
              </p>
            </div>

            {/* Ações */}
            <div className="flex shrink-0 items-center gap-1">
              <Link
                href={`/gestao/notificacoes/${n.id}`}
                aria-label={`Editar notificação "${n.title}"`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <DeleteButton id={n.id} title={n.title} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
