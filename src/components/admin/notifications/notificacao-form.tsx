"use client";

/**
 * Formulário de criação e edição de notificação broadcast.
 *
 * Usado em /gestao/notificacoes/nova e /gestao/notificacoes/[id].
 * React Hook Form + Zod (schema compartilhado em lib/notifications/schema.ts).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input, TextArea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  notificationInputSchema,
  NOTIFICATION_TYPES,
  NOTIFICATION_AUDIENCES,
} from "@/lib/notifications/schema";
import type { NotificationInputSchema, NotificationFormInput } from "@/lib/notifications/schema";
import { createNotificationAction, updateNotificationAction } from "@/server/actions/notifications";
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
        {required && (
          <span className="ml-1 text-terra-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-caption text-olive-700">{hint}</p>}
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
    control,
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
      className="flex flex-col gap-6 rounded-sm border border-divider bg-paper-50 p-6"
    >
      {/* Linha 1: tipo + audiência */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Tipo" htmlFor="type" error={errors.type?.message} required>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="type" hasError={!!errors.type}>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField label="Audiência" htmlFor="audience" error={errors.audience?.message} required>
          <Controller
            control={control}
            name="audience"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="audience" hasError={!!errors.audience}>
                  <SelectValue placeholder="Selecione a audiência" />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_AUDIENCES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {AUDIENCE_LABELS[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
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
        <Input
          id="title"
          type="text"
          maxLength={80}
          placeholder="ex: 20% off em todos os bolos esse final de semana"
          {...register("title")}
          hasError={!!errors.title}
        />
      </FormField>

      {/* Mensagem */}
      <FormField
        label="Mensagem"
        htmlFor="body"
        error={errors.body?.message}
        hint={`${bodyValue.length}/120 caracteres — aparece completa no sino (até 3 linhas)`}
        required
      >
        <TextArea
          id="body"
          rows={3}
          maxLength={120}
          placeholder="ex: Use o cupom VERDE20 no checkout. Válido de sexta a domingo."
          {...register("body")}
          hasError={!!errors.body}
          className="resize-none"
        />
      </FormField>

      {/* CTA opcional */}
      <div className="rounded-sm border border-divider p-4">
        <p className="mb-3 text-body-sm font-semibold text-olive-900">
          Botão de ação <span className="font-normal text-olive-700">(opcional)</span>
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Texto do botão"
            htmlFor="ctaLabel"
            error={errors.ctaLabel?.message}
            hint="Máx 40 caracteres"
          >
            <Input
              id="ctaLabel"
              type="text"
              maxLength={40}
              placeholder="ex: Ver promoção"
              {...register("ctaLabel")}
              hasError={!!errors.ctaLabel}
            />
          </FormField>

          <FormField
            label="Link interno"
            htmlFor="ctaHref"
            error={errors.ctaHref?.message}
            hint="Deve começar com / (ex: /cardapio)"
          >
            <Input
              id="ctaHref"
              type="text"
              placeholder="ex: /cardapio"
              {...register("ctaHref")}
              hasError={!!errors.ctaHref}
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
            <Controller
              control={control}
              name="couponCode"
              render={({ field }) => (
                // Radix Select não aceita value="" — sentinela __none__ ⇄ "".
                <Select
                  value={field.value ? field.value : "__none__"}
                  onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger id="couponCode">
                    <SelectValue placeholder="Nenhum (CTA só navega pelo link)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum (CTA só navega pelo link)</SelectItem>
                    {coupons.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} — {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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
          <Input
            id="publishedAt"
            type="datetime-local"
            {...register("publishedAt")}
            hasError={!!errors.publishedAt}
          />
        </FormField>

        <FormField
          label="Expirar em"
          htmlFor="expiresAt"
          error={errors.expiresAt?.message}
          required
        >
          <Input
            id="expiresAt"
            type="datetime-local"
            {...register("expiresAt")}
            hasError={!!errors.expiresAt}
          />
        </FormField>
      </div>

      {/* Erro global */}
      {serverError && (
        <div
          role="alert"
          className="rounded-sm border border-terra-500/40 bg-terra-500/10 px-4 py-3 text-body-sm text-terra-700"
        >
          {serverError}
        </div>
      )}

      {/* Ações */}
      <div className="flex items-center justify-end gap-3 border-t border-divider pt-4">
        <Button type="button" variant="secondary" size="sm" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          isLoading={isPending}
          disabled={isPending}
        >
          {isPending
            ? "Salvando…"
            : props.mode === "editar"
              ? "Salvar alterações"
              : "Publicar notificação"}
        </Button>
      </div>
    </form>
  );
}
