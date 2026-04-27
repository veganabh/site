import { z } from "zod";

/**
 * Zod schemas usados pelas server actions de auth.
 * Mensagens em PT-BR pra exibir direto em <FormMessage />.
 */

export const signUpSchema = z
  .object({
    firstName: z
      .string({ error: "Nome é obrigatório." })
      .trim()
      .min(2, "Nome muito curto.")
      .max(80, "Nome muito longo."),
    lastName: z
      .string()
      .trim()
      .max(80, "Sobrenome muito longo.")
      .optional()
      .or(z.literal("")),
    email: z
      .string({ error: "Email é obrigatório." })
      .trim()
      .toLowerCase()
      .email("Email inválido."),
    phone: z
      .string()
      .trim()
      .max(20)
      .optional()
      .or(z.literal("")),
    password: z
      .string({ error: "Senha é obrigatória." })
      .min(8, "Senha deve ter ao menos 8 caracteres.")
      .max(72, "Senha muito longa."),
    confirmPassword: z.string({ error: "Confirme a senha." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z
    .string({ error: "Email é obrigatório." })
    .trim()
    .toLowerCase()
    .email("Email inválido."),
  password: z
    .string({ error: "Senha é obrigatória." })
    .min(1, "Senha é obrigatória."),
});

export type SignInInput = z.infer<typeof signInSchema>;
