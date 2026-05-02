/**
 * Schema Zod compartilhado — usado tanto no server (actions) quanto no client (formulários).
 * Espelha exatamente as constraints do banco (migration 16).
 */

import { z } from "zod";

export const NOTIFICATION_TYPES = ["promo", "launch", "operational", "content"] as const;
export const NOTIFICATION_AUDIENCES = ["all", "authed"] as const;

export const notificationInputSchema = z
  .object({
    type: z.enum(NOTIFICATION_TYPES, {
      errorMap: () => ({ message: "Tipo inválido." }),
    }),

    title: z
      .string()
      .min(1, "Título obrigatório.")
      .max(80, "Título deve ter no máximo 80 caracteres."),

    body: z
      .string()
      .min(1, "Mensagem obrigatória.")
      .max(280, "Mensagem deve ter no máximo 280 caracteres."),

    ctaLabel: z
      .string()
      .min(1, "Rótulo do botão não pode ser vazio.")
      .max(40, "Rótulo deve ter no máximo 40 caracteres.")
      .nullish()
      .transform((v) => v ?? null),

    ctaHref: z
      .string()
      .regex(/^\//, "Link deve ser interno (começar com /).")
      .nullish()
      .transform((v) => v ?? null),

    audience: z.enum(NOTIFICATION_AUDIENCES, {
      errorMap: () => ({ message: "Público inválido." }),
    }),

    publishedAt: z.string().datetime({ message: "Data de publicação inválida." }),

    expiresAt: z.string().datetime({ message: "Data de expiração inválida." }),
  })
  .refine(
    (data) => {
      // CTA: ambos presentes ou ambos nulos
      const hasLabel = data.ctaLabel !== null && data.ctaLabel !== undefined;
      const hasHref = data.ctaHref !== null && data.ctaHref !== undefined;
      return hasLabel === hasHref;
    },
    {
      message: "Rótulo e link do CTA devem ser preenchidos juntos ou deixados em branco.",
      path: ["ctaLabel"],
    },
  )
  .refine(
    (data) => new Date(data.expiresAt) > new Date(data.publishedAt),
    {
      message: "A data de expiração deve ser posterior à data de publicação.",
      path: ["expiresAt"],
    },
  );

export type NotificationInputSchema = z.infer<typeof notificationInputSchema>;
