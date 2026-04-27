"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Lock, Mail } from "lucide-react";

import { signInAction, type AuthActionResult } from "@/server/auth/actions";
import { cn } from "@/lib/utils";

const INITIAL_STATE: AuthActionResult | null = null;

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AuthActionResult | null, FormData>(
    async (_prev, formData) => signInAction(formData),
    INITIAL_STATE,
  );

  const fieldErrors = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-divider bg-paper-50 p-5 md:p-6"
      aria-labelledby="login-titulo"
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <header className="flex flex-col gap-1">
        <h1 id="login-titulo" className="text-h2 font-bold text-olive-900">
          Entrar
        </h1>
        <p className="text-body-sm text-olive-700">
          Bem-vinda de volta. Cadê seus bolinhos.
        </p>
      </header>

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
          className="rounded-md bg-terra-500/10 px-3 py-2 text-[12px] font-semibold text-terra-700"
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-pill px-5 text-[13px] font-semibold transition-colors",
          pending
            ? "cursor-wait bg-sage-300 text-paper-50/80"
            : "bg-terra-500 text-paper-50 hover:bg-terra-700",
        )}
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>

      <p className="text-center text-[12px] text-olive-700">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-terra-700 hover:text-terra-500">
          Cadastrar
        </Link>
      </p>
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
  defaultValue?: string;
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
  defaultValue,
}: FieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold tracking-wide text-olive-700 uppercase">
        {label}
      </span>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-olive-700/60"
          aria-hidden="true"
        />
        <input
          name={name}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          defaultValue={defaultValue}
          aria-invalid={Boolean(errors?.length)}
          className="h-10 w-full rounded-md border border-divider bg-paper-50 pr-3 pl-9 text-body-sm text-olive-900 placeholder:text-olive-700/50"
        />
      </div>
      {errors?.length ? (
        <span role="alert" className="text-[11px] font-semibold text-terra-700">
          {errors[0]}
        </span>
      ) : null}
    </label>
  );
}
