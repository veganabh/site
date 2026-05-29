"use client";

/**
 * Lista de notificações broadcast para o painel admin.
 *
 * Exibe tipo, título, audiência, janela de visibilidade e status (ativa/expirada).
 * Ações: editar (link) + excluir (com confirmação inline).
 */

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  Rocket,
  AlertCircle,
  BookOpen,
  Eye,
  MousePointerClick,
  Search,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { deleteNotificationAction } from "@/server/actions/notifications";
import type { Notification, NotificationType } from "@/types/notification";
import { Card } from "@/components/ui/card";

/** Stats por notificação (espelha NotificationStats do server — type inline evita import server-only). */
type NotifStats = { reads: number; clicks: number; ctr: number | null };

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<NotificationType, string> = {
  promo: "Promoção",
  launch: "Lançamento",
  operational: "Aviso",
  content: "Conteúdo",
};

const AUDIENCE_LABEL: Record<string, string> = {
  all: "Ambos",
  authed: "Só clientes com conta",
  guest: "Só visitantes",
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

type NotifStatus = "agendada" | "ativa" | "expirada";

/**
 * 3 estados (antes só ativa/inativa, que marcava agendada como "inativa"):
 * - agendada: publishedAt no futuro
 * - ativa: dentro da janela publishedAt..expiresAt
 * - expirada: passou de expiresAt
 */
function statusOf(n: Notification): NotifStatus {
  const now = Date.now();
  const pub = new Date(n.publishedAt).getTime();
  const exp = new Date(n.expiresAt).getTime();
  if (pub > now) return "agendada";
  if (exp <= now) return "expirada";
  return "ativa";
}

const STATUS_LABEL: Record<NotifStatus, string> = {
  agendada: "Agendada",
  ativa: "Ativa",
  expirada: "Expirada",
};

const STATUS_BADGE: Record<NotifStatus, string> = {
  ativa: "bg-leaf-500/15 text-leaf-700",
  agendada: "bg-info/15 text-info",
  expirada: "bg-paper-100 text-olive-700/60",
};

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
        className="inline-flex h-7 items-center rounded-pill bg-terra-500 px-3 text-micro font-semibold text-paper-50 transition-colors hover:bg-terra-700 disabled:opacity-50"
      >
        {isPending ? "Excluindo…" : "Sim"}
      </button>
      <button
        type="button"
        onClick={() => setConfirm(false)}
        className="inline-flex h-7 items-center rounded-pill border border-divider bg-paper-50 px-3 text-micro font-medium text-olive-700 transition-colors hover:bg-paper-100"
      >
        Não
      </button>
    </div>
  );
}

// ── NotificacoesListClient ────────────────────────────────────────────────────

type Props = {
  notifications: Notification[];
  statsById: Record<string, NotifStats>;
};

const STATUS_FILTERS: (NotifStatus | "todas")[] = ["todas", "agendada", "ativa", "expirada"];
const STATUS_FILTER_LABEL: Record<NotifStatus | "todas", string> = {
  todas: "Todas",
  agendada: "Agendadas",
  ativa: "Ativas",
  expirada: "Expiradas",
};

const TYPE_FILTERS: (NotificationType | "todos")[] = [
  "todos",
  "promo",
  "launch",
  "operational",
  "content",
];

export function NotificacoesListClient({ notifications, statsById }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<NotifStatus | "todas">("todas");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "todos">("todos");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notifications.filter((n) => {
      if (q && !n.title.toLowerCase().includes(q) && !n.body.toLowerCase().includes(q)) {
        return false;
      }
      if (statusFilter !== "todas" && statusOf(n) !== statusFilter) return false;
      if (typeFilter !== "todos" && n.type !== typeFilter) return false;
      return true;
    });
  }, [notifications, query, statusFilter, typeFilter]);

  if (notifications.length === 0) {
    return (
      <Card padding="none" className="flex flex-col items-center gap-3 py-16 text-center">
        <Megaphone className="h-10 w-10 text-olive-700/20" strokeWidth={1.25} />
        <p className="text-body-sm text-olive-700">Nenhuma notificação cadastrada.</p>
        <Link
          href="/gestao/notificacoes/nova"
          className="inline-flex h-9 items-center gap-2 rounded-pill bg-olive-900 px-4 text-body-sm font-semibold text-paper-50 transition-colors hover:bg-olive-700"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Criar a primeira
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Barra de filtro */}
      <Card padding="sm" className="flex flex-col gap-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-olive-700"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título ou mensagem..."
            aria-label="Buscar notificação"
            className="w-full rounded-sm border border-divider bg-paper-50 py-1.5 pr-9 pl-9 text-body-sm text-olive-900 placeholder:text-olive-700/60 focus:border-olive-700 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-olive-700 hover:bg-paper-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {STATUS_FILTER_LABEL[s]}
            </FilterChip>
          ))}
          <span aria-hidden="true" className="mx-1 h-4 w-px bg-divider" />
          {TYPE_FILTERS.map((t) => (
            <FilterChip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
              {t === "todos" ? "Todos os tipos" : TYPE_LABELS[t]}
            </FilterChip>
          ))}
        </div>

        <span className="text-caption text-olive-700">
          <span className="font-semibold text-olive-900">{filtered.length}</span> de{" "}
          {notifications.length}
        </span>
      </Card>

      {filtered.length === 0 ? (
        <Card padding="none" className="border-dashed p-10 text-center">
          <p className="text-body-sm font-semibold text-olive-900">
            Nenhuma notificação encontrada.
          </p>
          <p className="text-caption text-olive-700">Ajuste a busca ou os filtros.</p>
        </Card>
      ) : (
        <Card
          padding="none"
          role="list"
          aria-label="Lista de notificações"
          className="flex flex-col divide-y divide-divider"
        >
          {filtered.map((n) => {
            const Icon = TYPE_ICONS[n.type];
            const status = statusOf(n);
            const stats = statsById[n.id] ?? { reads: 0, clicks: 0, ctr: null };
            const ctrLabel = stats.ctr === null ? "—" : `${Math.round(stats.ctr * 100)}%`;

            return (
              <div key={n.id} role="listitem" className="flex items-start gap-4 px-4 py-3">
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
                        "inline-flex h-5 items-center rounded-full px-2 text-micro font-bold tracking-wide uppercase",
                        STATUS_BADGE[status],
                      )}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                    <span className="text-micro font-medium text-olive-700/70">
                      {TYPE_LABELS[n.type]}
                    </span>
                    <span className="text-micro text-olive-700/50">
                      {AUDIENCE_LABEL[n.audience] ?? n.audience}
                    </span>
                  </div>

                  <p className="mt-0.5 line-clamp-1 text-body-sm font-semibold text-olive-900">
                    {n.title}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-caption text-olive-700">{n.body}</p>

                  <p className="mt-1 text-micro text-olive-700/50">
                    {formatDate(n.publishedAt)} → {formatDate(n.expiresAt)}
                  </p>

                  {/* Métricas por notificação */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-caption text-olive-700">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                      {stats.reads} {stats.reads === 1 ? "leitura" : "leituras"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MousePointerClick
                        className="h-3.5 w-3.5"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      {stats.clicks} {stats.clicks === 1 ? "clique" : "cliques"}
                    </span>
                    <span className="font-semibold text-olive-900">CTR {ctrLabel}</span>
                  </div>
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
        </Card>
      )}
    </div>
  );
}

// ── FilterChip ────────────────────────────────────────────────────────────────

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-pill border px-2.5 py-0.5 text-micro font-semibold transition-colors",
        active
          ? "border-olive-900 bg-olive-900 text-paper-50"
          : "border-divider bg-paper-50 text-olive-700 hover:bg-paper-100",
      )}
    >
      {children}
    </button>
  );
}
