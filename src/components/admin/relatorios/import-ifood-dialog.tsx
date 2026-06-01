"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, X, FileSpreadsheet, Check, Loader2, Link2, Link2Off } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import {
  parseIfoodReportAction,
  commitIfoodImportAction,
  type ParseIfoodResult,
  type IfoodProductOption,
} from "@/server/actions/import-ifood";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type Phase = "upload" | "preview" | "submitting" | "done";
type ParsedOk = Extract<ParseIfoodResult, { ok: true }>;

const NONE = "__none__"; // Radix Select não aceita value="" — sentinela p/ "não casar".

/** "yyyy-mm-dd" local (sem o shift de fuso do toISOString). */
function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Padrão: mês anterior fechado (caso comum de importar o relatório do mês). */
function defaultPeriod(): { start: string; end: string } {
  const now = new Date();
  const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthEnd = new Date(firstThisMonth.getTime() - 86400000);
  const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);
  return { start: isoDate(lastMonthStart), end: isoDate(lastMonthEnd) };
}

export function ImportIfoodButton() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("upload");
  const [parsed, setParsed] = useState<ParsedOk | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // ifoodName -> productId | NONE
  const [period, setPeriod] = useState(defaultPeriod);
  const [doneMsg, setDoneMsg] = useState<{ rows: number; mapped: number } | null>(null);

  function reset() {
    setPhase("upload");
    setParsed(null);
    setMapping({});
    setPeriod(defaultPeriod());
    setDoneMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) reset();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhase("submitting");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await parseIfoodReportAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        reset();
        return;
      }
      const initialMap: Record<string, string> = {};
      for (const r of res.rows) {
        initialMap[r.ifoodName] = r.suggestedProductId ?? NONE;
      }
      setParsed(res);
      setMapping(initialMap);
      setPhase("preview");
    } catch {
      toast.error("Falha ao ler o arquivo. Tente de novo.");
      reset();
    }
  }

  async function handleConfirm() {
    if (!parsed) return;
    setPhase("submitting");
    const rows = parsed.rows.map((r) => ({
      ifoodName: r.ifoodName,
      category: r.category,
      qty: r.qty,
      revenueCents: r.revenueCents,
      productId:
        mapping[r.ifoodName] && mapping[r.ifoodName] !== NONE ? mapping[r.ifoodName] : null,
    }));
    try {
      const res = await commitIfoodImportAction({
        periodStart: period.start,
        periodEnd: period.end,
        fileName: parsed.fileName,
        rows,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Falha ao importar.");
        setPhase("preview");
        return;
      }
      setDoneMsg({ rows: res.importedRows ?? rows.length, mapped: res.mappedCount ?? 0 });
      setPhase("done");
      toast.success(`${res.importedRows} itens importados do iFood.`);
      router.refresh();
    } catch {
      toast.error("Falha ao importar. Tente de novo.");
      setPhase("preview");
    }
  }

  const matchedCount = parsed
    ? parsed.rows.filter((r) => mapping[r.ifoodName] && mapping[r.ifoodName] !== NONE).length
    : 0;
  const unmatchedCount = parsed ? parsed.rows.length - matchedCount : 0;
  const periodInvalid = period.start === "" || period.end === "" || period.end < period.start;

  function productLabel(products: IfoodProductOption[], id: string): string {
    return products.find((p) => p.id === id)?.name ?? "Produto";
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Upload className="h-4 w-4" aria-hidden="true" />
          Importar iFood
        </Button>
      </DialogTrigger>

      <DialogContent size="lg" className="max-h-[88vh] overflow-y-auto p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <DialogTitle className="text-body font-bold text-olive-900">
              Importar relatório do iFood
            </DialogTitle>
            <DialogDescription className="text-caption text-olive-700">
              Suba o relatório “Itens do cardápio” (.xlsx) do iFood. As vendas entram nos Relatórios
              por canal — sem virar pedido no sistema.
            </DialogDescription>
          </div>
          <DialogClose
            aria-label="Fechar"
            className="rounded-sm p-1 text-olive-700 transition hover:bg-paper-100 hover:text-olive-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </DialogClose>
        </div>

        {/* ── UPLOAD ─────────────────────────────────────────────────── */}
        {phase === "upload" && (
          <div className="flex flex-col gap-4">
            <ol className="ml-4 list-decimal space-y-1 text-caption text-olive-700">
              <li>No iFood, baixe o relatório de desempenho “Itens do cardápio”.</li>
              <li>Confira que tem as colunas Nome do item, Vendas e Total vendas.</li>
              <li>Suba o .xlsx aqui embaixo.</li>
            </ol>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed border-divider bg-paper-100 px-4 py-8 text-center transition hover:border-olive-900/40 hover:bg-paper-50">
              <FileSpreadsheet className="h-7 w-7 text-olive-700" aria-hidden="true" />
              <span className="text-body-sm font-semibold text-olive-900">
                Clique para escolher o arquivo .xlsx
              </span>
              <span className="text-micro text-olive-700">do relatório do iFood</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFile}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* ── PREVIEW ────────────────────────────────────────────────── */}
        {phase === "preview" && parsed && (
          <div className="flex flex-col gap-4">
            <p className="text-caption text-olive-700">
              Arquivo: <span className="font-semibold text-olive-900">{parsed.fileName}</span> · aba{" "}
              <span className="font-semibold text-olive-900">{parsed.sheetName}</span>
            </p>

            {/* Período do relatório */}
            <div className="flex flex-col gap-2 rounded-sm border border-divider bg-paper-100 p-3">
              <span className="text-caption font-semibold text-olive-900">
                Período do relatório
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex flex-col gap-1 text-micro text-olive-700">
                  De
                  <Input
                    type="date"
                    value={period.start}
                    hasError={periodInvalid}
                    onChange={(e) => setPeriod((p) => ({ ...p, start: e.target.value }))}
                    className="h-9 w-40"
                  />
                </label>
                <label className="flex flex-col gap-1 text-micro text-olive-700">
                  Até
                  <Input
                    type="date"
                    value={period.end}
                    hasError={periodInvalid}
                    onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))}
                    className="h-9 w-40"
                  />
                </label>
              </div>
              <span className="text-micro text-olive-700">
                Re-importar o mesmo período substitui os dados anteriores.
              </span>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-3 gap-2">
              <SummaryCard label="Itens" value={parsed.totals.items} tone="muted" />
              <SummaryCard label="Casados" value={matchedCount} tone="leaf" />
              <SummaryCard
                label="Sem produto"
                value={unmatchedCount}
                tone={unmatchedCount > 0 ? "alert" : "muted"}
              />
            </div>

            {unmatchedCount > 0 && (
              <p className="text-micro text-olive-700">
                Itens “sem produto” entram na receita do canal, mas ficam de fora do lucro por
                produto (precisam de um produto com CPV). Você pode casá-los abaixo.
              </p>
            )}

            {/* Tabela de mapeamento */}
            <div className="overflow-x-auto rounded-sm border border-divider">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-divider bg-paper-100">
                    {["Item no iFood", "Qtd", "Receita", "Casar com produto"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-caption font-semibold tracking-wide text-olive-700 uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((r) => {
                    const value = mapping[r.ifoodName] ?? NONE;
                    const matched = value !== NONE;
                    return (
                      <tr key={r.ifoodName} className="border-b border-divider last:border-0">
                        <td className="px-3 py-2 text-caption font-semibold text-olive-900">
                          {r.ifoodName}
                          {r.matchSource === "fuzzy" && matched && (
                            <span className="ml-1.5 text-micro font-normal text-olive-700">
                              (sugerido)
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-caption text-olive-700 tabular-nums">
                          {r.qty}
                        </td>
                        <td className="px-3 py-2 text-caption text-olive-900 tabular-nums">
                          {formatBRL(r.revenueCents / 100)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            {matched ? (
                              <Link2 className="h-3.5 w-3.5 shrink-0 text-leaf-700" aria-hidden />
                            ) : (
                              <Link2Off
                                className="h-3.5 w-3.5 shrink-0 text-olive-500"
                                aria-hidden
                              />
                            )}
                            <Select
                              value={value}
                              onValueChange={(v) => setMapping((m) => ({ ...m, [r.ifoodName]: v }))}
                            >
                              <SelectTrigger className="h-9 min-w-[180px]">
                                <SelectValue>
                                  {matched ? productLabel(parsed.products, value) : "Não casar"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NONE}>Não casar</SelectItem>
                                {parsed.products.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={reset}
                className="text-caption font-medium text-olive-700 underline underline-offset-2 hover:text-olive-900"
              >
                Escolher outro arquivo
              </button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleConfirm}
                disabled={periodInvalid}
              >
                Importar {parsed.totals.items} itens
              </Button>
            </div>
          </div>
        )}

        {/* ── SUBMITTING ─────────────────────────────────────────────── */}
        {phase === "submitting" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="h-7 w-7 animate-spin text-olive-700" aria-hidden="true" />
            <p className="text-body-sm text-olive-700">Processando…</p>
          </div>
        )}

        {/* ── DONE ───────────────────────────────────────────────────── */}
        {phase === "done" && doneMsg && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2 rounded-sm border border-leaf-500/30 bg-leaf-500/5 p-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-leaf-700" aria-hidden="true" />
              <div className="text-caption text-olive-700">
                <p className="font-bold text-leaf-700">{doneMsg.rows} itens do iFood importados.</p>
                <p className="mt-0.5">
                  {doneMsg.mapped} casado(s) com produto — o casamento fica salvo pro próximo mês.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" size="sm" onClick={reset}>
                Importar outro
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="primary" size="sm">
                  Concluir
                </Button>
              </DialogClose>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "leaf" | "alert" | "muted";
}) {
  const toneClass = {
    leaf: "border-leaf-500/30 bg-leaf-500/5 text-leaf-700",
    alert: "border-terra-500/40 bg-terra-500/10 text-terra-700",
    muted: "border-divider bg-paper-100 text-olive-700",
  }[tone];
  return (
    <div className={cn("flex flex-col gap-1 rounded-sm border p-3", toneClass)}>
      <span className="text-micro font-semibold tracking-wide uppercase">{label}</span>
      <span className="text-h3 font-bold text-olive-900 tabular-nums">{value}</span>
    </div>
  );
}
