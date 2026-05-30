"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, IdCard, Mail, Phone, User } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateProfileAction, type ProfileActionResult } from "@/server/profile/actions";

const SAVED_FEEDBACK_MS = 2200;
const INITIAL_STATE: ProfileActionResult | null = null;

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCpf(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function ProfileForm() {
  const { user, refresh } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [cpf, setCpf] = useState(user?.cpf ? formatCpf(user.cpf) : "");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Reset dos campos quando o usuário muda — padrão "ajustar estado durante o
  // render" (React), com sentinela por id. Evita setState síncrono em effect.
  const [syncedUserId, setSyncedUserId] = useState(user?.id);
  if (user && user.id !== syncedUserId) {
    setSyncedUserId(user.id);
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setPhone(user.phone);
    setCpf(user.cpf ? formatCpf(user.cpf) : "");
  }

  const [state, formAction, pending] = useActionState<ProfileActionResult | null, FormData>(
    async (_prev, formData) => {
      const result = await updateProfileAction(formData);
      if (result.ok) {
        await refresh();
        setSavedAt(Date.now());
      }
      return result;
    },
    INITIAL_STATE,
  );

  useEffect(() => {
    if (!savedAt) return;
    const id = window.setTimeout(() => setSavedAt(null), SAVED_FEEDBACK_MS);
    return () => window.clearTimeout(id);
  }, [savedAt]);

  const dirty =
    user !== null &&
    (firstName.trim() !== user.firstName ||
      lastName.trim() !== user.lastName ||
      phone !== user.phone ||
      cpf.replace(/\D/g, "") !== user.cpf);

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form
      action={formAction}
      aria-labelledby="perfil-dados-titulo"
      className="flex flex-col gap-4 rounded-sm border border-divider bg-paper-50 p-4 md:p-5"
    >
      <header className="flex flex-col gap-1">
        <h2 id="perfil-dados-titulo" className="text-h3 font-bold text-olive-900">
          Seus dados
        </h2>
        <p className="text-caption leading-snug text-olive-700">
          Usados pra confirmar entrega e mandar atualização do pedido no WhatsApp. A gente não
          compartilha com ninguém.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Primeiro nome"
          icon={User}
          inputProps={{
            name: "firstName",
            value: firstName,
            onChange: (e) => setFirstName(e.target.value),
            autoComplete: "given-name",
            placeholder: "Ana",
            required: true,
          }}
          errors={fieldErrors.firstName}
        />
        <Field
          label="Sobrenome"
          icon={User}
          inputProps={{
            name: "lastName",
            value: lastName,
            onChange: (e) => setLastName(e.target.value),
            autoComplete: "family-name",
            placeholder: "Ribeiro",
          }}
          errors={fieldErrors.lastName}
        />
        <Field
          label="E-mail"
          icon={Mail}
          inputProps={{
            value: user?.email ?? "",
            disabled: true,
            type: "email",
            placeholder: "ana@exemplo.com",
          }}
          hint="Pra mudar o email, fala com a gente."
        />
        <Field
          label="WhatsApp"
          icon={Phone}
          inputProps={{
            name: "phone",
            value: phone,
            onChange: (e) => setPhone(formatPhone(e.target.value)),
            autoComplete: "tel",
            type: "tel",
            inputMode: "numeric",
            placeholder: "(31) 99999-9999",
          }}
          errors={fieldErrors.phone}
        />
        <Field
          label="CPF"
          icon={IdCard}
          inputProps={{
            name: "cpf",
            value: cpf,
            onChange: (e) => setCpf(formatCpf(e.target.value)),
            autoComplete: "off",
            inputMode: "numeric",
            placeholder: "000.000.000-00",
          }}
          errors={fieldErrors.cpf}
          hint="Necessário pra emitir o PIX. Fica só com a Veg.ana."
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

      <div className="flex items-center justify-between gap-3 pt-1">
        {savedAt ? (
          <p
            className="inline-flex items-center gap-1.5 text-caption font-semibold text-leaf-700"
            role="status"
            aria-live="polite"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={3} />
            Atualizado.
          </p>
        ) : (
          <span className="text-caption text-olive-700">{dirty ? "Alterações pendentes" : ""}</span>
        )}

        <Button
          type="submit"
          variant="primary"
          size="sm"
          isLoading={pending}
          disabled={!dirty || pending}
        >
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}

type FieldProps = {
  label: string;
  icon: React.ElementType;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
  errors?: string[];
  hint?: string;
};

function Field({ label, icon: Icon, inputProps, errors, hint }: FieldProps) {
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
          {...inputProps}
          aria-invalid={Boolean(errors?.length)}
          hasError={Boolean(errors?.length)}
          className={cn("pr-3 pl-9", inputProps.disabled && "bg-paper-100 text-olive-700")}
        />
      </div>
      {errors?.length ? (
        <span role="alert" className="text-micro font-semibold text-terra-700">
          {errors[0]}
        </span>
      ) : hint ? (
        <span className="text-micro text-olive-700">{hint}</span>
      ) : null}
    </label>
  );
}
