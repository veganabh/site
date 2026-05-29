"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Upload,
  Download,
  X,
  FileSpreadsheet,
  AlertTriangle,
  Check,
  Loader2,
  RefreshCw,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildTemplateCsv, parseProductCsv, toSlug, type ParsedCsv } from "@/lib/product-csv";
import { importProductsAction, type ImportProductsResult } from "@/server/actions/import-products";
import { useMenuStore } from "@/stores/menu-store";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Phase = "upload" | "preview" | "submitting" | "done";

export function ImportCsvButton() {
  const router = useRouter();
  const products = useMenuStore((s) => s.products);
  const existingSlugs = useMemo(() => new Set(products.map((p) => p.slug)), [products]);

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [rawText, setRawText] = useState<string>("");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [result, setResult] = useState<ImportProductsResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setPhase("upload");
    setFileName("");
    setRawText("");
    setParsed(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) reset();
  }

  function downloadTemplate() {
    const blob = new Blob([buildTemplateCsv()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-cardapio-vegana.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = parseProductCsv(text);
    setFileName(file.name);
    setRawText(text);
    setParsed(result);
    setPhase("preview");
  }

  async function handleConfirm() {
    setPhase("submitting");
    try {
      const res = await importProductsAction(rawText);
      setResult(res);
      setPhase("done");
      if (res.fatal) {
        toast.error(res.fatal);
      } else if (res.ok) {
        toast.success(`${res.created} criado(s), ${res.updated} atualizado(s).`);
        router.refresh();
      } else {
        toast.error("Nenhum produto importado. Confira os erros.");
      }
    } catch {
      setPhase("preview");
      toast.error("Falha no import. Tente de novo.");
    }
  }

  // ── Métricas do preview ────────────────────────────────────────────────────
  const okRows = parsed?.rows.filter((r) => r.ok) ?? [];
  const errorRows = parsed?.rows.filter((r) => !r.ok) ?? [];
  let toCreate = 0;
  let toUpdate = 0;
  for (const row of okRows) {
    if (row.ok) {
      if (existingSlugs.has(toSlug(row.data.nome))) toUpdate++;
      else toCreate++;
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Upload className="h-4 w-4" aria-hidden="true" />
          Importar CSV
        </Button>
      </DialogTrigger>

      <DialogContent size="lg" className="max-h-[85vh] overflow-y-auto p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <DialogTitle className="text-[16px] font-bold text-olive-900">
              Importar cardápio por planilha
            </DialogTitle>
            <DialogDescription className="text-[12px] text-olive-700">
              CSV com uma linha por produto. Foto você adiciona depois, no editar.
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
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex w-fit items-center gap-2 rounded-pill border border-olive-900/20 bg-paper-100 px-4 py-2 text-[13px] font-semibold text-olive-900 transition hover:bg-paper-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Baixar modelo (.csv)
            </button>

            <ol className="ml-4 list-decimal space-y-1 text-[12px] text-olive-700">
              <li>Baixe o modelo e abra no Excel ou Google Sheets.</li>
              <li>Preencha uma linha por produto (não mude os nomes das colunas).</li>
              <li>Salve como CSV e suba aqui embaixo.</li>
            </ol>

            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-divider bg-paper-100 px-4 py-8 text-center transition hover:border-olive-900/40 hover:bg-paper-50",
              )}
            >
              <FileSpreadsheet className="h-7 w-7 text-olive-700" aria-hidden="true" />
              <span className="text-[13px] font-semibold text-olive-900">
                Clique para escolher o arquivo CSV
              </span>
              <span className="text-[11px] text-olive-700">ou arraste para cá</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* ── PREVIEW ────────────────────────────────────────────────── */}
        {phase === "preview" && parsed && (
          <div className="flex flex-col gap-4">
            <p className="text-[12px] text-olive-700">
              Arquivo: <span className="font-semibold text-olive-900">{fileName}</span>
            </p>

            {parsed.fatal ? (
              <div className="flex items-start gap-2 rounded-xl border border-terra-500/30 bg-terra-500/5 p-3">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-terra-700"
                  aria-hidden="true"
                />
                <p className="text-[12px] text-terra-700">{parsed.fatal}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <SummaryCard
                    icon={<PlusCircle className="h-4 w-4" />}
                    label="Novos"
                    value={toCreate}
                    tone="leaf"
                  />
                  <SummaryCard
                    icon={<RefreshCw className="h-4 w-4" />}
                    label="Atualizar"
                    value={toUpdate}
                    tone="terra"
                  />
                  <SummaryCard
                    icon={<AlertTriangle className="h-4 w-4" />}
                    label="Com erro"
                    value={errorRows.length}
                    tone={errorRows.length > 0 ? "alert" : "muted"}
                  />
                </div>

                {errorRows.length > 0 && (
                  <div className="flex flex-col gap-2 rounded-xl border border-terra-500/30 bg-terra-500/5 p-3">
                    <p className="text-[12px] font-bold text-terra-700">
                      Linhas com erro (não serão importadas):
                    </p>
                    <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
                      {errorRows.map(
                        (row) =>
                          !row.ok && (
                            <li key={row.line} className="text-[11px] text-olive-700">
                              <span className="font-semibold text-olive-900">
                                Linha {row.line}:
                              </span>{" "}
                              {row.errors.join(" ")}
                            </li>
                          ),
                      )}
                    </ul>
                  </div>
                )}

                {okRows.length === 0 && (
                  <p className="text-[12px] text-terra-700">
                    Nenhuma linha válida para importar. Corrija e suba de novo.
                  </p>
                )}
              </>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={reset}
                className="text-[12px] font-medium text-olive-700 underline underline-offset-2 hover:text-olive-900"
              >
                Escolher outro arquivo
              </button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleConfirm}
                disabled={!!parsed.fatal || okRows.length === 0}
              >
                Importar {okRows.length > 0 ? `${okRows.length} produto(s)` : ""}
              </Button>
            </div>
          </div>
        )}

        {/* ── SUBMITTING ─────────────────────────────────────────────── */}
        {phase === "submitting" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="h-7 w-7 animate-spin text-olive-700" aria-hidden="true" />
            <p className="text-[13px] text-olive-700">Importando…</p>
          </div>
        )}

        {/* ── DONE ───────────────────────────────────────────────────── */}
        {phase === "done" && result && (
          <div className="flex flex-col gap-4">
            {result.fatal ? (
              <div className="flex items-start gap-2 rounded-xl border border-terra-500/30 bg-terra-500/5 p-3">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-terra-700"
                  aria-hidden="true"
                />
                <p className="text-[12px] text-terra-700">{result.fatal}</p>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-xl border border-leaf-500/30 bg-leaf-500/5 p-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-leaf-700" aria-hidden="true" />
                <div className="text-[12px] text-olive-700">
                  <p className="font-bold text-leaf-700">
                    {result.created} criado(s), {result.updated} atualizado(s).
                  </p>
                  {result.categoriesCreated.length > 0 && (
                    <p className="mt-0.5">
                      Categorias criadas: {result.categoriesCreated.join(", ")}.
                    </p>
                  )}
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="flex flex-col gap-2 rounded-xl border border-terra-500/30 bg-terra-500/5 p-3">
                <p className="text-[12px] font-bold text-terra-700">
                  {result.errors.length} linha(s) com erro:
                </p>
                <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
                  {result.errors.map((e) => (
                    <li key={e.line} className="text-[11px] text-olive-700">
                      <span className="font-semibold text-olive-900">Linha {e.line}:</span>{" "}
                      {e.messages.join(" ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "leaf" | "terra" | "alert" | "muted";
}) {
  const toneClass = {
    leaf: "border-leaf-500/30 bg-leaf-500/5 text-leaf-700",
    terra: "border-terra-500/30 bg-terra-500/5 text-terra-700",
    alert: "border-terra-500/40 bg-terra-500/10 text-terra-700",
    muted: "border-divider bg-paper-100 text-olive-700",
  }[tone];

  return (
    <div className={cn("flex flex-col gap-1 rounded-xl border p-3", toneClass)}>
      <span className="flex items-center gap-1.5 text-[11px] font-semibold">
        {icon}
        {label}
      </span>
      <span className="text-[20px] font-bold text-olive-900 tabular-nums">{value}</span>
    </div>
  );
}
