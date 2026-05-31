"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Lock, Mail, Phone, User } from "lucide-react";

import { signUpAction, type AuthActionResult } from "@/server/auth/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthBrandBanner } from "@/components/auth/auth-brand-panel";

const INITIAL_STATE: AuthActionResult | null = null;

export function SignUpForm() {
  const [state, formAction, pending] = useActionState<AuthActionResult | null, FormData>(
    async (_prev, formData) => signUpAction(formData),
    INITIAL_STATE,
  );

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const success = state?.ok === true;

  if (success) {
    return (
      <div className="flex w-full max-w-md flex-col gap-4">
        <AuthBrandBanner />
        <div
          role="status"
          className="flex flex-col gap-3 rounded-sm bg-paper-50 p-6 text-center shadow-md md:p-8"
        >
          <h1 className="text-h1 font-bold text-olive-900">Cadastro recebido</h1>
          <p className="text-body-sm text-olive-700">
            Confirma o e-mail que a gente acabou de mandar pra liberar seu acesso.
          </p>
          <Link
            href="/login"
            className="mx-auto inline-flex h-11 items-center justify-center rounded-full bg-terra-500 px-5 text-body-sm font-semibold text-paper-50 hover:bg-terra-700"
          >
            Ir pro login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <AuthBrandBanner />

      <form
        action={formAction}
        className="flex flex-col gap-5 rounded-sm bg-paper-50 p-6 shadow-md md:p-8"
        aria-labelledby="cadastro-titulo"
      >
        <header className="flex flex-col gap-1">
          <h1 id="cadastro-titulo" className="text-h1 font-bold text-olive-900">
            Criar conta
          </h1>
          <p className="text-body-sm text-olive-700">
            Pra acompanhar pedidos e fechar mais rápido na próxima.
          </p>
        </header>

        <div className="flex flex-col gap-4">
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
        </div>

        {state && !state.ok ? (
          <p
            role="alert"
            className="rounded-sm bg-terra-500/10 px-3 py-2 text-caption font-semibold text-terra-700"
          >
            {state.message}
          </p>
        ) : null}

        <Button type="submit" variant="primary" isLoading={pending} disabled={pending}>
          {pending ? "Cadastrando…" : "Cadastrar"}
        </Button>

        <p className="text-center text-caption text-olive-700">
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-terra-700 hover:text-terra-500">
            Entrar
          </Link>
        </p>
      </form>

      <p className="text-center text-micro text-olive-700">
        Sem lactose · 100% vegano · entrega no mesmo dia
      </p>
    </div>
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
