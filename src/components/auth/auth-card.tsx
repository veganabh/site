"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { LoginForm } from "@/components/auth/login-form";
import { SignUpForm } from "@/components/auth/signup-form";

/**
 * Card de autenticação com abas Entrar / Criar conta em um único card
 * (estilo segmented control). A troca é client-side — sem reload — e
 * sincroniza a URL via History API pra preservar deep-link e o `next`
 * de redirect pós-login (as rotas /login e /cadastro continuam existindo;
 * cada uma só define a aba inicial).
 */

type Tab = "signin" | "signup";

export function AuthCard({ defaultTab, next }: { defaultTab: Tab; next?: string }) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  function select(target: Tab) {
    if (target === tab) return;
    setTab(target);
    // Atualiza a URL sem navegar (não desmonta o card nem perde foco).
    const path = target === "signin" ? "/login" : "/cadastro";
    const url = target === "signin" && next ? `${path}?next=${encodeURIComponent(next)}` : path;
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="flex max-h-[calc(100dvh-2rem)] w-full flex-col gap-5 overflow-y-auto rounded-sm bg-paper-50 p-6 shadow-lg md:p-7">
      <header className="flex flex-col gap-1">
        <h1 className="text-h3 font-bold text-olive-900">Que bom ter você aqui</h1>
        <p className="text-body-sm text-olive-700">
          Entre ou crie sua conta pra acompanhar pedidos.
        </p>
      </header>

      {/* Abas — segmented control */}
      <div
        role="tablist"
        aria-label="Entrar ou criar conta"
        className="grid grid-cols-2 gap-1 rounded-sm bg-paper-100 p-1"
      >
        <TabButton active={tab === "signin"} controls="auth-panel" onClick={() => select("signin")}>
          Entrar
        </TabButton>
        <TabButton active={tab === "signup"} controls="auth-panel" onClick={() => select("signup")}>
          Criar conta
        </TabButton>
      </div>

      <div id="auth-panel" role="tabpanel">
        {tab === "signin" ? <LoginForm next={next} /> : <SignUpForm />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  controls,
  onClick,
  children,
}: {
  active: boolean;
  controls: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={cn(
        "h-9 rounded-sm text-body-sm font-semibold transition-colors",
        active ? "bg-paper-50 text-olive-900 shadow-sm" : "text-olive-700 hover:text-olive-900",
      )}
    >
      {children}
    </button>
  );
}
