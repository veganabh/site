"use client";

/**
 * Bloco de configurações de encomendas para /gestao/configuracoes.
 * Edita: lead mín/máx (dias), valor mínimo, capacidade por dia, janela horária.
 */

import { useState } from "react";
import { useAdminSettingsStore } from "@/stores/admin-settings-store";
import { updateStoreSettingsAction } from "@/server/actions/store-settings";
import { Card } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

function NumInput({
  id,
  value,
  onChange,
  onBlur,
  min,
  max,
  className,
}: {
  id: string;
  value: number | string;
  onChange: (v: number) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <input
      id={id}
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      onBlur={onBlur}
      className={cn(
        "w-20 rounded-sm border border-divider bg-paper-50 px-2 py-1.5 text-body-sm text-olive-900",
        "focus:ring-2 focus:ring-olive-900 focus:ring-offset-1 focus:outline-none",
        className,
      )}
    />
  );
}

export function PreorderSettingsBlock() {
  const preorder = useAdminSettingsStore((s) => s.preorder);
  const updatePreorder = useAdminSettingsStore((s) => s.updatePreorder);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const capacityEnabled = preorder.dailyCapacity !== null;

  async function persist(patch: Partial<typeof preorder>) {
    setSaving(true);
    setSaveError(null);
    updatePreorder(patch);
    const merged = { ...preorder, ...patch };
    const result = await updateStoreSettingsAction({ preorder: merged });
    setSaving(false);
    if (!result.ok) setSaveError(result.message);
  }

  return (
    <Card as="section" padding="md" aria-labelledby="cfg-preorder-title">
      <header className="mb-4 flex flex-col gap-1">
        <h2 id="cfg-preorder-title" className="text-h3 text-olive-900">
          Configurações de encomenda
        </h2>
        <p className="text-body-sm text-olive-700">
          Regras para aceitar pedidos agendados — antecedência, valor mínimo e janela de entrega.
        </p>
      </header>

      <div className="flex flex-col gap-5">
        {/* Lead mín/máx */}
        <div className="flex flex-col gap-1.5">
          <p className="text-body-sm font-semibold text-olive-900">Antecedência (dias)</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="cfg-preorder-min-lead" className="text-body-sm text-olive-700">
                Mínimo
              </label>
              <NumInput
                id="cfg-preorder-min-lead"
                value={preorder.minLeadDays}
                min={0}
                max={30}
                onChange={(v) => updatePreorder({ minLeadDays: v })}
                onBlur={() => persist({ minLeadDays: preorder.minLeadDays })}
              />
              <span className="text-body-sm text-olive-700">dias</span>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="cfg-preorder-max-lead" className="text-body-sm text-olive-700">
                Máximo
              </label>
              <NumInput
                id="cfg-preorder-max-lead"
                value={preorder.maxLeadDays}
                min={1}
                max={365}
                onChange={(v) => updatePreorder({ maxLeadDays: v })}
                onBlur={() => persist({ maxLeadDays: preorder.maxLeadDays })}
              />
              <span className="text-body-sm text-olive-700">dias</span>
            </div>
          </div>
          <p className="text-caption text-olive-700">
            Cliente pode agendar entre <strong>hoje + {preorder.minLeadDays}</strong> e{" "}
            <strong>hoje + {preorder.maxLeadDays}</strong> dias.
          </p>
        </div>

        {/* Valor mínimo */}
        <div className="flex flex-col gap-1.5">
          <p className="text-body-sm font-semibold text-olive-900">Valor mínimo</p>
          <div className="flex items-center gap-2">
            <span className="text-body-sm text-olive-700">R$</span>
            <NumInput
              id="cfg-preorder-min-value"
              value={preorder.minValueCents / 100}
              min={0}
              onChange={(v) => updatePreorder({ minValueCents: Math.round(v * 100) })}
              onBlur={() => persist({ minValueCents: preorder.minValueCents })}
            />
          </div>
          <p className="text-caption text-olive-700">
            Encomenda mínima de R$ {(preorder.minValueCents / 100).toFixed(2).replace(".", ",")}.
          </p>
        </div>

        {/* Capacidade por dia */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <p className="text-body-sm font-semibold text-olive-900">Capacidade por dia</p>
              <p className="text-caption text-olive-700">
                {capacityEnabled
                  ? `Máximo ${preorder.dailyCapacity} encomendas por dia.`
                  : "Ilimitado — aceita qualquer quantidade por dia."}
              </p>
            </div>
            <Toggle
              checked={capacityEnabled}
              onCheckedChange={(enabled) => {
                const next = enabled ? 5 : null;
                persist({ dailyCapacity: next });
              }}
              size="md"
              aria-label="Ativar limite de capacidade por dia"
            />
          </div>

          {capacityEnabled && (
            <div className="flex items-center gap-2">
              <label htmlFor="cfg-preorder-capacity" className="text-body-sm text-olive-700">
                Máximo por dia
              </label>
              <NumInput
                id="cfg-preorder-capacity"
                value={preorder.dailyCapacity ?? 5}
                min={1}
                onChange={(v) => updatePreorder({ dailyCapacity: v })}
                onBlur={() => persist({ dailyCapacity: preorder.dailyCapacity })}
              />
              <span className="text-body-sm text-olive-700">encomendas</span>
            </div>
          )}
        </div>

        {/* Janela horária */}
        <div className="flex flex-col gap-1.5">
          <p className="text-body-sm font-semibold text-olive-900">Janela de entrega (hora)</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="cfg-preorder-hour-from" className="text-body-sm text-olive-700">
                De
              </label>
              <NumInput
                id="cfg-preorder-hour-from"
                value={preorder.hourFrom}
                min={0}
                max={23}
                onChange={(v) => updatePreorder({ hourFrom: v })}
                onBlur={() => persist({ hourFrom: preorder.hourFrom })}
              />
              <span className="text-body-sm text-olive-700">h</span>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="cfg-preorder-hour-to" className="text-body-sm text-olive-700">
                Até
              </label>
              <NumInput
                id="cfg-preorder-hour-to"
                value={preorder.hourTo}
                min={0}
                max={23}
                onChange={(v) => updatePreorder({ hourTo: v })}
                onBlur={() => persist({ hourTo: preorder.hourTo })}
              />
              <span className="text-body-sm text-olive-700">h</span>
            </div>
          </div>
          <p className="text-caption text-olive-700">
            Cliente escolhe hora entre {preorder.hourFrom}h e {preorder.hourTo}h.
          </p>
        </div>
      </div>

      {saving && <p className="mt-3 text-caption text-olive-700">Salvando…</p>}
      {saveError && (
        <p role="alert" className="mt-3 text-caption text-terra-700">
          {saveError}
        </p>
      )}
    </Card>
  );
}
