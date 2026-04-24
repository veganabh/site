"use client";

import { useEffect, useState } from "react";
import { Check, Mail, Phone, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDevSessionStore } from "@/stores/dev-session-store";

const SAVED_FEEDBACK_MS = 2200;

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function ProfileForm() {
  const user = useDevSessionStore((s) => s.user);
  const updateUser = useDevSessionStore((s) => s.updateUser);

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!savedAt) return;
    const id = window.setTimeout(() => setSavedAt(null), SAVED_FEEDBACK_MS);
    return () => window.clearTimeout(id);
  }, [savedAt]);

  const dirty =
    firstName.trim() !== user.firstName ||
    lastName.trim() !== user.lastName ||
    email.trim() !== user.email ||
    phone !== user.phone;

  const firstNameOk = firstName.trim().length >= 2;
  const emailOk = isValidEmail(email);
  const phoneOk = phone.replace(/\D/g, "").length >= 10;
  const canSave = dirty && firstNameOk && emailOk && phoneOk;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    updateUser({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone,
    });
    setSavedAt(Date.now());
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby="perfil-dados-titulo"
      className="flex flex-col gap-4 rounded-2xl border border-divider bg-paper-50 p-4 md:p-5"
    >
      <header className="flex flex-col gap-1">
        <h2 id="perfil-dados-titulo" className="text-h3 font-bold text-olive-900">
          Seus dados
        </h2>
        <p className="text-[12px] leading-snug text-olive-700">
          Usados pra confirmar entrega e mandar atualização do pedido no WhatsApp. A gente não
          compartilha com ninguém.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Primeiro nome"
          icon={User}
          inputProps={{
            value: firstName,
            onChange: (e) => setFirstName(e.target.value),
            autoComplete: "given-name",
            placeholder: "Ana",
          }}
        />
        <Field
          label="Sobrenome"
          icon={User}
          inputProps={{
            value: lastName,
            onChange: (e) => setLastName(e.target.value),
            autoComplete: "family-name",
            placeholder: "Ribeiro",
          }}
        />
        <Field
          label="E-mail"
          icon={Mail}
          inputProps={{
            value: email,
            onChange: (e) => setEmail(e.target.value),
            autoComplete: "email",
            type: "email",
            placeholder: "ana@exemplo.com",
          }}
        />
        <Field
          label="WhatsApp"
          icon={Phone}
          inputProps={{
            value: phone,
            onChange: (e) => setPhone(formatPhone(e.target.value)),
            autoComplete: "tel",
            type: "tel",
            inputMode: "numeric",
            placeholder: "(31) 99999-9999",
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        {savedAt ? (
          <p
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-leaf-700"
            role="status"
            aria-live="polite"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={3} />
            Atualizado.
          </p>
        ) : (
          <span className="text-[12px] text-olive-700/70">
            {dirty ? "Alterações pendentes" : ""}
          </span>
        )}

        <button
          type="submit"
          disabled={!canSave}
          className={cn(
            "inline-flex h-10 items-center justify-center gap-2 rounded-pill px-5 text-[13px] font-semibold transition-colors",
            canSave
              ? "bg-terra-500 text-paper-50 hover:bg-terra-700"
              : "cursor-not-allowed bg-sage-300 text-paper-50/80",
          )}
        >
          Salvar alterações
        </button>
      </div>
    </form>
  );
}

type FieldProps = {
  label: string;
  icon: React.ElementType;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
};

function Field({ label, icon: Icon, inputProps }: FieldProps) {
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
          {...inputProps}
          className="h-10 w-full rounded-md border border-divider bg-paper-50 pr-3 pl-9 text-body-sm text-olive-900 placeholder:text-olive-700/50"
        />
      </div>
    </label>
  );
}
