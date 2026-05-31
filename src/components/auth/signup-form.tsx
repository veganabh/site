"use client";

import { useActionState } from "react";
import { Lock, Mail, Phone, User } from "lucide-react";

import { signUpAction, type AuthActionResult } from "@/server/auth/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const INITIAL_STATE: AuthActionResult | null = null;

/**
 * Formulário de cadastro — apenas o <form> (campos + submit). Sem card/marca:
 * o wrapper (card, abas, foto, aside) vive em `AuthCard` + layout (auth).
 *
 * Layout compacto (gap-3) pra caber em tela cheia sem scroll junto das abas.
 */
export function SignUpForm() {
  const [state, formAction, pending] = useActionState<AuthActionResult | null, FormData>(
    async (_prev, formData) => signUpAction(formData),
    INITIAL_STATE,
  );

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const success = state?.ok === true;

  if (success) {
    return (
      <div role="status" className="flex flex-col gap-3 py-2 text-center">
        <h2 className="text-h3 font-bold text-olive-900">Cadastro recebido</h2>
        <p className="text-body-sm text-olive-700">
          Confirma o e-mail que a gente acabou de mandar pra liberar seu acesso.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3" aria-label="Formulário de cadastro">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          name="firstName"
          label="Primeiro nome"
          icon={User}
          autoComplete="given-name"
          placeholder="Ana"
          errors={fieldErrors.firstName}
          required
        />
        <Field
          name="lastName"
          label="Sobrenome"
          icon={User}
          autoComplete="family-name"
          placeholder="Ribeiro"
          errors={fieldErrors.lastName}
        />
      </div>

      <Field
        name="email"
        label="E-mail"
        type="email"
        icon={Mail}
        autoComplete="email"
        placeholder="voce@exemplo.com"
        errors={fieldErrors.email}
        required
      />

      <Field
        name="phone"
        label="WhatsApp"
        type="tel"
        icon={Phone}
        autoComplete="tel"
        placeholder="(31) 99999-9999"
        errors={fieldErrors.phone}
      />

      <Field
        name="password"
        label="Senha"
        type="password"
        icon={Lock}
        autoComplete="new-password"
        placeholder="Pelo menos 8 caracteres"
        errors={fieldErrors.password}
        required
      />

      <Field
        name="confirmPassword"
        label="Confirmar senha"
        type="password"
        icon={Lock}
        autoComplete="new-password"
        placeholder="Repete a senha"
        errors={fieldErrors.confirmPassword}
        required
      />

      {state && !state.ok ? (
        <p
          role="alert"
          className="rounded-sm bg-terra-500/10 px-3 py-2 text-caption font-semibold text-terra-700"
        >
          {state.message}
        </p>
      ) : null}

      <Button type="submit" variant="primary" isLoading={pending} disabled={pending}>
        {pending ? "Cadastrando…" : "Criar conta"}
      </Button>
    </form>
  );
}

type FieldProps = {
  name: string;
  label: string;
  type?: string;
  icon: React.ElementType;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  errors?: string[];
};

function Field({
  name,
  label,
  type = "text",
  icon: Icon,
  autoComplete,
  placeholder,
  required,
  errors,
}: FieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-micro font-semibold tracking-wide text-olive-700 uppercase">
        {label}
      </span>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-olive-700"
          aria-hidden="true"
        />
        <Input
          name={name}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          aria-invalid={Boolean(errors?.length)}
          hasError={Boolean(errors?.length)}
          className="h-10 pr-3 pl-9"
        />
      </div>
      {errors?.length ? (
        <span role="alert" className="text-micro font-semibold text-terra-700">
          {errors[0]}
        </span>
      ) : null}
    </label>
  );
}
