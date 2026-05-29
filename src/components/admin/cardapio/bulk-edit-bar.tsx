"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tag, Boxes, FolderInput, Eye, EyeOff, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useActiveCategories } from "@/stores/categories-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  bulkDeleteProductsAction,
  bulkSetActiveProductsAction,
  bulkSetStockProductsAction,
  bulkSetCategoryProductsAction,
  bulkUpdatePriceProductsAction,
} from "@/server/actions/products";
import { PRICE_BULK_MODES, type PriceBulkMode, type BulkActionResult } from "@/lib/products-bulk";

type ActivePanel = "price" | "stock" | "category" | "delete" | null;

const PRICE_MODE_LABELS: Record<PriceBulkMode, string> = {
  set: "Definir preço fixo (R$)",
  inc_pct: "Aumentar por % ",
  dec_pct: "Reduzir por %",
  inc_abs: "Aumentar R$ fixo",
  dec_abs: "Reduzir R$ fixo",
};

const inputClass =
  "h-9 w-full rounded-sm border border-divider bg-paper-50 px-3 text-body-sm text-olive-900 placeholder:text-olive-700/50 focus:border-olive-500 focus:outline-none";

type BulkEditBarProps = {
  selectedIds: string[];
  onClearSelection: () => void;
};

/**
 * Barra de ação em massa do cardápio. Fixa no rodapé quando ≥1 produto
 * selecionado. Cada ação abre um painel inline (sem portal) com seu input.
 * Pós-sucesso: limpa seleção + router.refresh() re-hidrata o MenuStore.
 */
export function BulkEditBar({ selectedIds, onClearSelection }: BulkEditBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [panel, setPanel] = useState<ActivePanel>(null);
  const [error, setError] = useState<string | null>(null);

  // Inputs dos painéis
  const categories = useActiveCategories();
  const [priceMode, setPriceMode] = useState<PriceBulkMode>("set");
  const [priceValue, setPriceValue] = useState("");
  const [stockValue, setStockValue] = useState("");
  const [category, setCategory] = useState<string>("");

  const count = selectedIds.length;

  const run = (fn: () => Promise<BulkActionResult>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPanel(null);
      setPriceValue("");
      setStockValue("");
      onClearSelection();
      router.refresh();
    });
  };

  const togglePanel = (next: ActivePanel) => {
    setError(null);
    setPanel((curr) => (curr === next ? null : next));
  };

  return (
    <div className="sticky bottom-3 z-30 mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-2 rounded-sm border border-olive-900/15 bg-paper-50 p-3 shadow-lg">
        {/* Linha principal */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-8 items-center rounded-full bg-olive-900 px-3 text-caption font-bold text-paper-50">
            {count} {count === 1 ? "selecionado" : "selecionados"}
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            <BarButton
              icon={Tag}
              label="Preço"
              active={panel === "price"}
              onClick={() => togglePanel("price")}
            />
            <BarButton
              icon={Boxes}
              label="Estoque"
              active={panel === "stock"}
              onClick={() => togglePanel("stock")}
            />
            <BarButton
              icon={FolderInput}
              label="Categoria"
              active={panel === "category"}
              onClick={() => togglePanel("category")}
            />
            <BarButton
              icon={Eye}
              label="Ativar"
              onClick={() => run(() => bulkSetActiveProductsAction(selectedIds, true))}
            />
            <BarButton
              icon={EyeOff}
              label="Desativar"
              onClick={() => run(() => bulkSetActiveProductsAction(selectedIds, false))}
            />
            <BarButton
              icon={Trash2}
              label="Deletar"
              tone="terra"
              active={panel === "delete"}
              onClick={() => togglePanel("delete")}
            />
          </div>

          <button
            type="button"
            onClick={onClearSelection}
            aria-label="Limpar seleção"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-sm border border-terra-500 bg-terra-500/10 px-3 py-2 text-caption text-terra-700"
          >
            {error}
          </p>
        )}

        {/* Painel: Preço */}
        {panel === "price" && (
          <div className="flex flex-wrap items-end gap-2 border-t border-divider pt-2">
            <label className="flex min-w-[180px] flex-1 flex-col gap-1">
              <span className="text-caption font-semibold text-olive-700">Tipo de ajuste</span>
              <Select value={priceMode} onValueChange={(v) => setPriceMode(v as PriceBulkMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_BULK_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {PRICE_MODE_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex w-28 flex-col gap-1">
              <span className="text-caption font-semibold text-olive-700">
                {priceMode === "inc_pct" || priceMode === "dec_pct" ? "Percentual" : "Valor (R$)"}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                placeholder={priceMode.includes("pct") ? "10" : "0,00"}
                className={inputClass}
              />
            </label>
            <Button
              variant="primary"
              size="sm"
              disabled={isPending || !priceValue}
              onClick={() =>
                run(() =>
                  bulkUpdatePriceProductsAction({
                    ids: selectedIds,
                    mode: priceMode,
                    value: Number(priceValue),
                  }),
                )
              }
            >
              Aplicar
            </Button>
          </div>
        )}

        {/* Painel: Estoque */}
        {panel === "stock" && (
          <div className="flex flex-wrap items-end gap-2 border-t border-divider pt-2">
            <label className="flex w-36 flex-col gap-1">
              <span className="text-caption font-semibold text-olive-700">Definir estoque</span>
              <input
                type="number"
                min="0"
                step="1"
                value={stockValue}
                onChange={(e) => setStockValue(e.target.value)}
                placeholder="ex: 10"
                className={inputClass}
              />
            </label>
            <Button
              variant="primary"
              size="sm"
              disabled={isPending || stockValue === ""}
              onClick={() =>
                run(() =>
                  bulkSetStockProductsAction({ ids: selectedIds, value: Number(stockValue) }),
                )
              }
            >
              Aplicar a {count}
            </Button>
          </div>
        )}

        {/* Painel: Categoria */}
        {panel === "category" && (
          <div className="flex flex-wrap items-end gap-2 border-t border-divider pt-2">
            <label className="flex min-w-[200px] flex-1 flex-col gap-1">
              <span className="text-caption font-semibold text-olive-700">
                Mover para categoria
              </span>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <Button
              variant="primary"
              size="sm"
              disabled={isPending || !category}
              onClick={() =>
                run(() => bulkSetCategoryProductsAction({ ids: selectedIds, category }))
              }
            >
              Mover {count}
            </Button>
          </div>
        )}

        {/* Painel: Deletar (confirmação) */}
        {panel === "delete" && (
          <div className="flex flex-wrap items-center gap-3 border-t border-divider pt-2">
            <p className="flex-1 text-caption text-olive-900">
              Excluir <strong>{count}</strong> {count === 1 ? "produto" : "produtos"}? Eles somem do
              cardápio (site e produção). Reversível só via banco.
            </p>
            <Button variant="secondary" size="sm" onClick={() => setPanel(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={isPending}
              onClick={() => run(() => bulkDeleteProductsAction(selectedIds))}
            >
              Excluir {count}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function BarButton({
  icon: Icon,
  label,
  active = false,
  tone = "neutral",
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  active?: boolean;
  tone?: "neutral" | "terra";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-caption font-semibold transition-colors",
        tone === "terra"
          ? active
            ? "border-terra-500 bg-terra-500 text-paper-50"
            : "border-divider bg-paper-50 text-terra-700 hover:bg-terra-500/10"
          : active
            ? "border-olive-900 bg-olive-900 text-paper-50"
            : "border-divider bg-paper-50 text-olive-700 hover:bg-paper-100",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden={true} />
      {label}
    </button>
  );
}
