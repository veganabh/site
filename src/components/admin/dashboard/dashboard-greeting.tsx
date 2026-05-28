"use client";

import { useSession } from "@/lib/auth/use-session";
import { greetingFor } from "@/lib/dashboard-metrics";

/**
 * Saudação dinâmica do dashboard: "{Bom dia/tarde/noite}, {primeiro nome}.".
 * Nome vem da sessão logada (useSession). Hora é local do navegador.
 * Sem nome (carregando ou ausente): saudação sozinha.
 */
export function DashboardGreeting() {
  const { user } = useSession();
  const greeting = greetingFor(new Date());
  const firstName = user?.firstName?.trim();

  return (
    <div className="flex flex-col gap-0.5">
      <h1 className="text-h2 font-bold text-olive-900">
        {greeting}
        {firstName ? `, ${firstName}` : ""}.
      </h1>
      <p className="text-body-sm text-olive-700 italic">Aqui está o resumo de hoje.</p>
    </div>
  );
}
