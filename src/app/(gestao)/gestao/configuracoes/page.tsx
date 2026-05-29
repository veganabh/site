"use client";

/**
 * /gestao/configuracoes — Ajustes operacionais da loja.
 *
 * Três blocos:
 *  A. Status da loja (ATIVO / PAUSADO)
 *  B. Horário de funcionamento (informativo por ora)
 *  C. Impressora de pedidos (stub para Fase 5)
 *
 * Persistência automática via Zustand + localStorage (vegana.admin-settings).
 * Não há botão "Salvar" — cada alteração persiste ao instante.
 */

import { useAdminSettingsStore } from "@/stores/admin-settings-store";
import type { WeekHours } from "@/stores/admin-settings-store";
import { updateStoreSettingsAction } from "@/server/actions/store-settings";
import { Toggle } from "@/components/ui/toggle";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Persiste o estado atual do store (após setter otimista) no Supabase.
function persistHours() {
  void updateStoreSettingsAction({ hours: useAdminSettingsStore.getState().hours });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<keyof WeekHours, string> = {
  mon: "Segunda",
  tue: "Terça",
  wed: "Quarta",
  thu: "Quinta",
  fri: "Sexta",
  sat: "Sábado",
  sun: "Domingo",
};

const WEEK_ORDER: (keyof WeekHours)[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// ── Bloco A — Status da loja ───────────────────────────────────────────────────

function StoreStatusBlock() {
  const storeStatus = useAdminSettingsStore((s) => s.storeStatus);
  const setStoreStatus = useAdminSettingsStore((s) => s.setStoreStatus);

  const isAtivo = storeStatus === "ATIVO";

  return (
    <section
      aria-labelledby="cfg-status-title"
      className={cn(
        "rounded-sm border p-5",
        isAtivo ? "border-divider bg-paper-50" : "border-terra-500/30 bg-terra-500/5",
      )}
    >
      <header className="mb-4 flex flex-col gap-1">
        <h2 id="cfg-status-title" className="text-h3 text-olive-900">
          Status da loja
        </h2>
        <p className="text-body-sm text-olive-700">
          Controle se a loja está aceitando pedidos agora.
        </p>
      </header>

      <div className="flex items-center justify-between gap-4">
        {/* Label + indicador visual */}
        <div className="flex flex-col gap-0.5">
          <span
            id="cfg-status-label"
            className={cn("text-body font-semibold", isAtivo ? "text-olive-900" : "text-terra-700")}
          >
            {isAtivo ? "Loja aberta" : "Loja pausada"}
          </span>
          <span className="text-body-sm text-olive-700">
            {isAtivo
              ? "Clientes podem finalizar pedidos normalmente."
              : "Clientes ainda navegam, mas não conseguem finalizar pedido."}
          </span>
        </div>

        <Toggle
          checked={isAtivo}
          onCheckedChange={(checked) => {
            const next = checked ? "ATIVO" : "PAUSADO";
            setStoreStatus(next);
            void updateStoreSettingsAction({ storeStatus: next });
          }}
          size="lg"
          aria-labelledby="cfg-status-label"
        />
      </div>

      {!isAtivo && (
        <p
          role="status"
          className="mt-4 rounded-sm border border-terra-500/30 bg-terra-500/10 px-4 py-3 text-body-sm text-terra-700"
        >
          A loja está pausada. Reative quando estiver pronta para receber pedidos.
        </p>
      )}
    </section>
  );
}

// ── Bloco B — Horário de funcionamento ────────────────────────────────────────

function HoursBlock() {
  const hours = useAdminSettingsStore((s) => s.hours);
  const toggleDayOpen = useAdminSettingsStore((s) => s.toggleDayOpen);
  const updateDayHours = useAdminSettingsStore((s) => s.updateDayHours);

  return (
    <Card as="section" padding="none" aria-labelledby="cfg-hours-title" className="p-4">
      <header className="mb-3 flex flex-col gap-0.5">
        <h2 id="cfg-hours-title" className="text-body-lg font-semibold text-olive-900">
          Horário de funcionamento
        </h2>
        <p className="text-caption text-olive-700">
          Referência informativa. Pedidos fora desse horário seguem normalmente — em breve voltam
          como &ldquo;agendado pra depois&rdquo;.
        </p>
      </header>

      <fieldset>
        <legend className="sr-only">Dias e horários de funcionamento</legend>

        <div className="flex flex-col divide-y divide-divider">
          {WEEK_ORDER.map((day) => {
            const dayData = hours[day];
            const labelId = `cfg-day-label-${day}`;
            const toggleId = `cfg-day-toggle-${day}`;
            const fromId = `cfg-day-from-${day}`;
            const toId = `cfg-day-to-${day}`;

            const hasTimeError =
              dayData.open && dayData.from && dayData.to && dayData.to <= dayData.from;

            return (
              <div key={day} className="flex flex-wrap items-center gap-2 py-2 sm:flex-nowrap">
                {/* Label do dia */}
                <span
                  id={labelId}
                  className={cn(
                    "w-16 shrink-0 text-body-sm font-semibold",
                    dayData.open ? "text-olive-900" : "text-olive-700",
                  )}
                >
                  {DAY_LABELS[day]}
                </span>

                {/* Toggle aberto/fechado */}
                <Toggle
                  id={toggleId}
                  checked={dayData.open}
                  onCheckedChange={() => {
                    toggleDayOpen(day);
                    persistHours();
                  }}
                  size="md"
                  aria-labelledby={labelId}
                />

                {/* Status label acessível */}
                <span
                  className={cn(
                    "w-14 text-caption font-medium",
                    dayData.open ? "text-leaf-700" : "text-olive-700",
                  )}
                  aria-hidden="true"
                >
                  {dayData.open ? "Aberto" : "Fechado"}
                </span>

                {/* Inputs de horário — só quando aberto */}
                {dayData.open && (
                  <div className="flex items-center gap-1.5">
                    <label htmlFor={fromId} className="sr-only">
                      Abre
                    </label>
                    <input
                      id={fromId}
                      type="time"
                      value={dayData.from}
                      onChange={(e) => updateDayHours(day, { from: e.target.value })}
                      onBlur={persistHours}
                      aria-label={`${DAY_LABELS[day]} — abre`}
                      className={cn(
                        "rounded-sm border px-1.5 py-0.5 text-caption text-olive-900",
                        "focus:ring-2 focus:ring-olive-900 focus:ring-offset-1 focus:outline-none",
                        hasTimeError
                          ? "border-terra-500 bg-terra-500/5"
                          : "border-divider bg-paper-50",
                      )}
                    />

                    <span className="text-caption text-olive-700" aria-hidden="true">
                      –
                    </span>

                    <label htmlFor={toId} className="sr-only">
                      Fecha
                    </label>
                    <input
                      id={toId}
                      type="time"
                      value={dayData.to}
                      onChange={(e) => updateDayHours(day, { to: e.target.value })}
                      onBlur={persistHours}
                      aria-label={`${DAY_LABELS[day]} — fecha`}
                      className={cn(
                        "rounded-sm border px-1.5 py-0.5 text-caption text-olive-900",
                        "focus:ring-2 focus:ring-olive-900 focus:ring-offset-1 focus:outline-none",
                        hasTimeError
                          ? "border-terra-500 bg-terra-500/5"
                          : "border-divider bg-paper-50",
                      )}
                    />

                    {/* Erro de validação inline */}
                    {hasTimeError && (
                      <p role="alert" className="text-caption font-medium text-terra-700">
                        Fechamento deve ser depois da abertura.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>
    </Card>
  );
}

// ── Bloco C — Impressora ───────────────────────────────────────────────────────

function PrinterBlock() {
  const printerEnabled = useAdminSettingsStore((s) => s.printerEnabled);
  const printerName = useAdminSettingsStore((s) => s.printerName);
  const setPrinterEnabled = useAdminSettingsStore((s) => s.setPrinterEnabled);
  const setPrinterName = useAdminSettingsStore((s) => s.setPrinterName);

  return (
    <Card as="section" padding="md" aria-labelledby="cfg-printer-title">
      <header className="mb-4 flex flex-col gap-1">
        <h2 id="cfg-printer-title" className="text-h3 text-olive-900">
          Impressora de pedidos
        </h2>
        <p className="text-body-sm text-olive-700">
          Integração real com impressora térmica chega na Fase 5. Por enquanto os pedidos aparecem
          só no painel.
        </p>
      </header>

      {/* Toggle + status */}
      <div className="flex items-center justify-between gap-4">
        <span
          id="cfg-printer-label"
          className={cn(
            "text-body font-semibold",
            printerEnabled ? "text-olive-900" : "text-olive-700",
          )}
        >
          {printerEnabled
            ? "Impressora conectada · modelo: simulado"
            : "Sem impressora configurada"}
        </span>

        <Toggle
          checked={printerEnabled}
          onCheckedChange={(v) => {
            setPrinterEnabled(v);
            void updateStoreSettingsAction({ printerEnabled: v });
          }}
          size="md"
          aria-labelledby="cfg-printer-label"
        />
      </div>

      {/* Campo nome — só quando habilitado */}
      {printerEnabled && (
        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="cfg-printer-name" className="text-body-sm font-medium text-olive-900">
            Nome da impressora
          </label>
          <input
            id="cfg-printer-name"
            type="text"
            value={printerName}
            onChange={(e) => setPrinterName(e.target.value)}
            onBlur={() =>
              void updateStoreSettingsAction({
                printerName: useAdminSettingsStore.getState().printerName,
              })
            }
            placeholder="Ex.: Epson TM-T20"
            className={cn(
              "w-full max-w-sm rounded-sm border border-divider bg-paper-50 px-3 py-2",
              "text-body-sm text-olive-900 placeholder:text-olive-700",
              "focus:ring-2 focus:ring-olive-900 focus:ring-offset-1 focus:outline-none",
            )}
          />
          <p className="text-caption text-olive-700">
            Só um rótulo por ora — sem funcionalidade ativa até a Fase 5.
          </p>
        </div>
      )}

      {!printerEnabled && (
        <p className="mt-2 text-body-sm text-olive-700">Pedidos aparecem só no painel digital.</p>
      )}
    </Card>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 font-bold text-olive-900">Configurações</h1>
        <p className="text-body-lg text-olive-700 italic">
          Ajustes operacionais da loja — status, horários e periféricos.
        </p>
      </div>

      {/* Blocos */}
      <StoreStatusBlock />
      <HoursBlock />
      <PrinterBlock />
    </div>
  );
}
