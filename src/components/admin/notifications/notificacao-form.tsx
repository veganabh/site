"use client";

/**
 * Formulário de criação e edição de notificação broadcast.
 *
 * Usado em /gestao/notificacoes/nova e /gestao/notificacoes/[id].
 * React Hook Form + Zod (schema compartilhado em lib/notifications/schema.ts).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { cn } from "@/lib/utils";
import { notificationInputSchema, NOTIFICATION_TYPES, NOTIFICATION_AUDIENCES } from "@/lib/notifications/schema";
import type { NotificationInputSchema, NotificationFormInput } from "@/lib/notifications/schema";
import {
  createNotificationAction,
  updateNotificationAction,
} from "@/server/actions/notifications";
import type { Notification } from "@/types/notification";

// ── Labels ────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  promo: "Promoção / desconto",
  launch: "Lançamento de produto",
  operational: "Aviso operacional",
  content: "Conteúdo / dica",
};

const AUDIENCE_LABELS: Record<string, string> = {
  all: "Ambos",
  authed: "Só clientes com conta",
  guest: "Só visitantes",
};

// ── Helpers de data ───────────────────────────────────────────────────────────

/** Converte Date para string no formato aceito por datetime-local input. */
function toDatetimeLocal(iso: string): string {
  // Remove timezone para datetime-local (browser interpreta como local)
  return iso.slice(0, 16);
}

/** Converte valor de datetime-local para ISO 8601 com Z (UTC). */
function fromDatetimeLocal(val: string): string {
  if (!val) return "";
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toISOString();
}

// ── Defaults ──────────────────────────────────────────────────────────────────

function defaultPublishedAt(): string {
  return new Date().toISOString().slice(0, 16);
}

function defaultExpiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 16);
}

// ── FormField ─────────────────────────────────────────────────────────────────

type FormFieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
};

function FormField({ label, htmlFor, error, hint, required, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-body-sm font-semibold text-olive-900">
        {label}
        {required && <span className="ml-1 text-terra-500" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-caption text-olive-700/70">{hint}</p>}
      {error && (
        <p role="alert" className="text-caption text-terra-700">
          {error}
        </p>
      )}
    </div>
  );
}

// ── NotificacaoForm ───────────────────────────────────────────────────────────

export type CouponOption = { code: string; label: string };

type NotificacaoFormProps = {
  /** Cupons ativos disponíveis pra anexar à notificação. */
  coupons: CouponOption[];
} & ({ mode: "nova" } | { mode: "editar"; notification: Notification });

export function NotificacaoForm(props: NotificacaoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const { coupons } = props;
  const notification = props.mode === "editar" ? props.notification : null;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<NotificationFormInput, unknown, NotificationInputSchema>({
    resolver: zodResolver(notificationInputSchema),
    defaultValues: notification
      ? {
          type: notification.type,
          title: notification.title,
          body: notification.body,
          ctaLabel: notification.ctaLabel ?? null,
          ctaHref: notification.ctaHref ?? null,
          couponCode: notification.couponCode ?? null,
          audience: notification.audience,
          publishedAt: toDatetimeLocal(notification.publishedAt),
          expiresAt: toDatetimeLocal(notification.expiresAt),
        }
      : {
          type: "promo",
          audience: "all",
          publishedAt: defaultPublishedAt(),
          expiresAt: defaultExpiresAt(),
        },
  });

  const bodyValue = watch("body") ?? "";
  const titleValue = watch("title") ?? "";

  const onSubmit = (values: NotificationInputSchema) => {
    setServerError(null);
    startTransition(async () => {
      // Normaliza datas para ISO UTC antes de enviar
      const input = {
        ...values,
        publishedAt: fromDatetimeLocal(values.publishedAt),
        expiresAt: fromDatetimeLocal(values.expiresAt),
      };

      const result =
        props.mode === "editar"
          ? await updateNotificationAction(notification!.id, input)
          : await createNotificationAction(input);

      if (!result.ok) {
        setServerError(result.message);
        return;
      }

      router.push("/gestao/notificacoes");
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6 rounded-lg border border-divider bg-paper-50 p-6"
    >
      {/* Linha 1: tipo + audiência */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Tipo" htmlFor="type" error={errors.type?.message} required>
          <select
            id="type"
            {...register("type")}
            className={cn(
              "h-10 w-full rounded-md border border-divider bg-paper-50 px-3 text-body-sm text-olive-900 transition-colors",
              "focus:border-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-500/20",
              errors.type && "border-terra-500",
            )}
          >
            {NOTIFICATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Audiência" htmlFor="audience" error={errors.audience?.message} required>
          <select
            id="audience"
            {...register("audience")}
            className={cn(
              "h-10 w-full rounded-md border border-divider bg-paper-50 px-3 text-body-sm text-olive-900 transition-colors",
              "focus:border-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-500/20",
              errors.audience && "border-terra-500",
            )}
          >
            {NOTIFICATION_AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {AUDIENCE_LABELS[a]}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {/* Título */}
      <FormField
        label="Título"
        htmlFor="title"
        error={errors.title?.message}
        hint={`${titleValue.length}/80 caracteres`}
        required
      >
        <input
          id="title"
          type="text"
          maxLength={80}
          placeholder="ex: 20% off em todos os bolos esse final de semana"
          {...register("title")}
          className={cn(
            "h-10 w-full rounded-md border border-divider bg-paper-50 px-3 text-body-sm text-olive-900 placeholder:text-olive-700/40",
            "focus:border-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-500/20",
            errors.title && "border-terra-500",
          )}
        />
      </FormField>

      {/* Mensagem */}
      <FormField
        label="Mensagem"
        htmlFor="body"
        error={errors.body?.message}
        hint={`${bodyValue.length}/280 caracteres — aparece no sino, truncado em 2 linhas`}
        required
      >
        <textarea
          id="body"
          rows={3}
          maxLength={280}
          placeholder="ex: Use o cupom VERDE20 no checkout. Válido de sexta a domingo."
          {...register("body")}
          className={cn(
            "w-full resize-none rounded-md border border-divider bg-paper-50 px-3 py-2.5 text-body-sm text-olive-900 placeholder:text-olive-700/40",
            "focus:border-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-500/20",
            errors.body && "border-terra-500",
          )}
        />
      </FormField>

      {/* CTA opcional */}
      <div className="rounded-md border border-divider p-4">
        <p className="mb-3 text-body-sm font-semibold text-olive-900">
          Botão de ação{" "}
          <span className="font-normal text-olive-700/70">(opcional)</span>
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Texto do botão"
            htmlFor="ctaLabel"
            error={errors.ctaLabel?.message}
            hint="Máx 40 caracteres"
          >
            <input
              id="ctaLabel"
              type="text"
              maxLength={40}
              placeholder="ex: Ver promoção"
              {...register("ctaLabel")}
              className={cn(
                "h-10 w-full rounded-md border border-divider bg-paper-50 px-3 text-body-sm text-olive-900 placeholder:text-olive-700/40",
                "focus:border-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-500/20",
                errors.ctaLabel && "border-terra-500",
              )}
            />
          </FormField>

          <FormField
            label="Link interno"
            htmlFor="ctaHref"
            error={errors.ctaHref?.message}
            hint="Deve começar com / (ex: /cardapio)"
          >
            <input
              id="ctaHref"
              type="text"
              placeholder="ex: /cardapio"
              {...register("ctaHref")}
              className={cn(
                "h-10 w-full rounded-md border border-divider bg-paper-50 px-3 text-body-sm text-olive-900 placeholder:text-olive-700/40",
                "focus:border-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-500/20",
                errors.ctaHref && "border-terra-500",
              )}
            />
          </FormField>
        </div>

        {/* Cupom anexado — CTA aplica no carrinho ao clicar */}
        <div className="mt-4 border-t border-divider pt-4">
          <FormField
            label="Cupom no CTA"
            htmlFor="couponCode"
            error={errors.couponCode?.message}
            hint="Se escolher, clicar no botão aplica o cupom no carrinho do cliente automaticamente."
          >
            <select
              id="couponCode"
              {...register("couponCode")}
              className={cn(
                "h-10 w-full rounded-md border border-divider bg-paper-50 px-3 text-body-sm text-olive-900",
                "focus:border-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-500/20",
              )}
            >
              <option value="">Nenhum (CTA só navega pelo link)</option>
              {coupons.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </div>

      {/* Janela de visibilidade */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Publicar em"
          htmlFor="publishedAt"
          error={errors.publishedAt?.message}
          required
        >
          <input
            id="publishedAt"
            type="datetime-local"
            {...register("publishedAt")}
            className={cn(
              "h-10 w-full rounded-md border border-divider bg-paper-50 px-3 text-body-sm text-olive-900",
              "focus:border-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-500/20",
              errors.publishedAt && "border-terra-500",
            )}
          />
        </FormField>

        <FormField
          label="Expirar em"
          htmlFor="expiresAt"
          error={errors.expiresAt?.message}
          required
        >
          <input
            id="expiresAt"
            type="datetime-local"
            {...register("expiresAt")}
            className={cn(
              "h-10 w-full rounded-md border border-divider bg-paper-50 px-3 text-body-sm text-olive-900",
              "focus:border-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-500/20",
              errors.expiresAt && "border-terra-500",
            )}
          />
        </FormField>
      </div>

      {/* Erro global */}
      {serverError && (
        <div
          role="alert"
          className="rounded-md border border-terra-500/40 bg-terra-500/10 px-4 py-3 text-body-sm text-terra-700"
        >
          {serverError}
        </div>
      )}

      {/* Ações */}
      <div className="flex items-center justify-end gap-3 border-t border-divider pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-10 items-center rounded-pill border border-divider bg-paper-50 px-5 text-[13px] font-medium text-olive-700 transition-colors hover:bg-paper-100"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center rounded-pill bg-olive-900 px-5 text-[13px] font-semibold text-paper-50 transition-colors hover:bg-olive-700 disabled:opacity-60"
        >
          {isPending
            ? "Salvando…"
            : props.mode === "editar"
              ? "Salvar alterações"
              : "Publicar notificação"}
        </button>
      </div>
    </form>
  );
}
