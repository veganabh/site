"use client";

import { useActionState } from "react";
import { Lock, Mail } from "lucide-react";

import { signInAction, type AuthActionResult } from "@/server/auth/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const INITIAL_STATE: AuthActionResult | null = null;

/**
 * Formulário de login — apenas o <form> (campos + submit). Sem card/marca:
 * o wrapper (card, abas, foto, aside) vive em `AuthCard` + layout (auth).
 */
export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AuthActionResult | null, FormData>(
    async (_prev, formData) => signInAction(formData),
    INITIAL_STATE,
  );

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="flex flex-col gap-4" aria-label="Formulário de login">
      {next ? <input type="hidden" name="next" value={next} /> : null}

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
        name="password"
        label="Senha"
        type="password"
        icon={Lock}
        autoComplete="current-password"
        placeholder="••••••••"
        errors={fieldErrors.password}
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
        {pending ? "Entrando…" : "Entrar"}
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
    <label className="flex flex-col gap-1.5">
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
          className="pr-3 pl-9"
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
