"use client";

import { forwardRef, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import Image from "next/image";
import type { Product } from "@/types/product";
import { useActiveCategories } from "@/stores/categories-store";
import { createProductAction, updateProductAction } from "@/server/actions/products";
import { uploadProductPhotoAction } from "@/server/actions/upload-product-photo";
import { Input, TextArea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { marginByChannel, type ChannelMargin } from "@/lib/fees";
import { formatBRL } from "@/lib/format";
import { Store, Bike } from "lucide-react";

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

// Campos numéricos ficam como string no formulário (HTML input retorna string).
// A conversão para number acontece no onSubmit para manter tipagem correta.
const positiveNum = (msg: string, min = 0) =>
  z.string().refine((v) => {
    const n = Number(v);
    return !isNaN(n) && n > min;
  }, msg);

const nonNegativeNum = (msg: string) =>
  z.string().refine((v) => {
    const n = Number(v);
    return !isNaN(n) && n >= 0;
  }, msg);

// Campo numérico opcional: vazio é aceito (vira 0 no submit).
const optionalNonNegativeNum = (msg: string) =>
  z.string().refine((v) => {
    if (v.trim() === "") return true;
    const n = Number(v);
    return !isNaN(n) && n >= 0;
  }, msg);

const produtoSchema = z.object({
  name: z.string().min(2, "Nome precisa ter pelo menos 2 caracteres."),
  description: z.string().min(10, "Descrição muito curta."),
  category: z.string().min(1, "Selecione a categoria."),
  gramatura_g: optionalNonNegativeNum("Gramatura inválida."),
  price_site: positiveNum("Preço inválido."),
  price_ifood: positiveNum("Preço iFood inválido."),
  cost: nonNegativeNum("Custo inválido."),
  photo_url: z.string().optional(),
  photo_alt: z.string().optional(),
  active: z.boolean(),
  stock: nonNegativeNum("Estoque não pode ser negativo."),
  lowStockThreshold: positiveNum("Alerta precisa ser pelo menos 1.", 0),
  availableForPreorder: z.boolean(),
});

type ProdutoFormValues = z.infer<typeof produtoSchema>;

type ProdutoFormProps = { mode: "novo" } | { mode: "editar"; product: Product };

// ──────────────────────────────────────────────────────────────────────────

export function ProdutoForm(props: ProdutoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Campos numéricos são strings no form (HTML retorna string)
  const defaultValues: ProdutoFormValues =
    props.mode === "editar"
      ? {
          name: props.product.name,
          description: props.product.description,
          category: props.product.category,
          gramatura_g: String(props.product.gramatura_g),
          price_site: String(props.product.price_site),
          price_ifood: String(props.product.price_ifood),
          cost: String(props.product.cost ?? 0),
          photo_url: props.product.photo.url,
          photo_alt: props.product.photo.alt,
          active: props.product.active,
          stock: String(props.product.stock),
          lowStockThreshold: String(props.product.lowStockThreshold),
          availableForPreorder: props.product.availableForPreorder,
        }
      : {
          name: "",
          description: "",
          category: "",
          gramatura_g: "",
          price_site: "",
          price_ifood: "",
          cost: "0",
          photo_url: "",
          photo_alt: "",
          active: true,
          stock: "0",
          lowStockThreshold: "3",
          availableForPreorder: false,
        };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoSchema),
    defaultValues,
  });

  const categories = useActiveCategories();
  const previewUrl = watch("photo_url");
  // Campos observados pra calcular a margem por canal ao vivo (read-only).
  const watchedPriceSite = watch("price_site");
  const watchedPriceIfood = watch("price_ifood");
  const watchedCost = watch("cost");

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("Imagem maior que 2 MB. Reduza antes de enviar.");
      event.target.value = "";
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.split(",").includes(file.type)) {
      setUploadError("Formato inválido. Use JPG, PNG ou WebP.");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadProductPhotoAction(formData);
      if (!result.ok) {
        setUploadError(result.message);
        return;
      }
      setValue("photo_url", result.url, { shouldValidate: true, shouldDirty: true });
    } catch {
      setUploadError("Falha no upload. Tente novamente.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function onSubmit(values: ProdutoFormValues) {
    setServerError(null);
    startTransition(async () => {
      const payload = {
        name: values.name,
        description: values.description,
        category: values.category,
        gramatura_g: Number(values.gramatura_g),
        price_site: Number(values.price_site),
        price_ifood: Number(values.price_ifood),
        cost: Number(values.cost),
        photo_url: values.photo_url ?? "",
        photo_alt: values.photo_alt ?? values.name,
        active: values.active,
        stock: Number(values.stock),
        lowStockThreshold: Number(values.lowStockThreshold),
        availableForPreorder: values.availableForPreorder,
        attributes: ["sem-lactose", "vegano"] as ("sem-lactose" | "vegano")[],
        tags: [] as never[],
        contains: [] as never[],
      };

      const result =
        props.mode === "novo"
          ? await createProductAction(payload)
          : await updateProductAction(props.product.id, payload);

      if (!result.ok) {
        setServerError(result.message);
        return;
      }
      router.push("/gestao/cardapio");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6 rounded-sm border border-divider bg-paper-50 p-5"
      noValidate
    >
      <Field label="Nome do produto" error={errors.name?.message}>
        <Input
          {...register("name")}
          type="text"
          placeholder="Ex: Bolo no Pote — Brigadeiro"
          hasError={!!errors.name}
        />
      </Field>

      <Field label="Descrição" error={errors.description?.message}>
        <TextArea
          {...register("description")}
          rows={3}
          placeholder="Descreva os ingredientes e o que torna este produto especial."
          hasError={!!errors.description}
          className="resize-y"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Categoria" error={errors.category?.message}>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger hasError={!!errors.category}>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field label="Gramatura (g) · opcional" error={errors.gramatura_g?.message}>
          <Input
            {...register("gramatura_g")}
            type="number"
            min={0}
            placeholder="opcional"
            hasError={!!errors.gramatura_g}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Preço no site" error={errors.price_site?.message}>
          <MoneyInput
            {...register("price_site")}
            placeholder="17,90"
            hasError={!!errors.price_site}
          />
        </Field>

        <Field label="Preço no iFood" error={errors.price_ifood?.message}>
          <MoneyInput
            {...register("price_ifood")}
            placeholder="18,90"
            hasError={!!errors.price_ifood}
          />
        </Field>

        <Field
          label="Custo / CPV"
          error={errors.cost?.message}
          hint="Custo de produção por unidade. Usado pra calcular margem em Relatórios."
        >
          <MoneyInput {...register("cost")} placeholder="6,50" hasError={!!errors.cost} />
        </Field>
      </div>

      {/* Margem por canal — somente leitura, calculada ao vivo */}
      <MarginPanel
        priceSite={Number(watchedPriceSite)}
        priceIfood={Number(watchedPriceIfood)}
        cost={Number(watchedCost)}
      />

      {/* Estoque */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Estoque (unidades)"
          error={errors.stock?.message}
          hint="Quantidade disponível para venda. 0 = esgotado."
        >
          <Input
            {...register("stock")}
            type="number"
            min={0}
            step={1}
            placeholder="0"
            hasError={!!errors.stock}
          />
        </Field>

        <Field
          label="Alerta de estoque baixo"
          error={errors.lowStockThreshold?.message}
          hint="Aviso aparece quando o estoque chegar neste número."
        >
          <Input
            {...register("lowStockThreshold")}
            type="number"
            min={1}
            step={1}
            placeholder="3"
            hasError={!!errors.lowStockThreshold}
          />
        </Field>
      </div>

      <Field
        label="Foto do produto"
        error={errors.photo_url?.message ?? uploadError ?? undefined}
        hint="JPG, PNG ou WebP. Máximo 2 MB."
      >
        <input type="hidden" {...register("photo_url")} />
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            onChange={onFileChange}
            disabled={isUploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            isLoading={isUploading}
          >
            {isUploading ? "Enviando..." : previewUrl ? "Trocar imagem" : "Enviar imagem"}
          </Button>
          {previewUrl && (
            <div className="relative h-24 w-24 overflow-hidden rounded-sm border border-divider bg-paper-100">
              <Image
                src={previewUrl}
                alt="Prévia da foto"
                fill
                className="object-cover"
                sizes="96px"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>
      </Field>

      <Field label="Texto alternativo da foto" error={errors.photo_alt?.message}>
        <Input
          {...register("photo_alt")}
          type="text"
          placeholder="Bolo de cenoura com cobertura de brigadeiro em prato claro"
          hasError={!!errors.photo_alt}
        />
      </Field>

      <div className="flex flex-col gap-3 rounded-sm border border-divider bg-paper-50 p-4">
        <div className="flex items-center gap-3">
          <input
            {...register("active")}
            id="active"
            type="checkbox"
            className="h-4 w-4 accent-olive-900"
          />
          <label htmlFor="active" className="text-body-sm text-olive-900">
            Produto ativo (visível no cardápio)
          </label>
        </div>

        <div className="flex items-start gap-3">
          <input
            {...register("availableForPreorder")}
            id="availableForPreorder"
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-olive-900"
          />
          <div className="flex flex-col gap-0.5">
            <label htmlFor="availableForPreorder" className="text-body-sm text-olive-900">
              Disponível para encomenda
            </label>
            <p className="text-caption text-olive-700">
              Aparece na aba Encomendas e aceita pedidos futuros, independente do estoque.
            </p>
          </div>
        </div>
      </div>

      {serverError && (
        <p
          role="alert"
          className="rounded-sm border border-terra-500 bg-terra-500/10 px-3 py-2 text-body-sm text-terra-700"
        >
          {serverError}
        </p>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          type="submit"
          variant="primary"
          isLoading={isPending}
          disabled={isSubmitting || isPending || isUploading}
        >
          {isPending
            ? "Salvando..."
            : props.mode === "novo"
              ? "Adicionar produto"
              : "Salvar alterações"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/gestao/cardapio")}
          disabled={isPending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-body-sm font-semibold text-olive-900">{label}</label>
      {hint && <p className="text-caption text-olive-500">{hint}</p>}
      {children}
      {error && <p className="text-caption text-terra-700">{error}</p>}
    </div>
  );
}

/**
 * Painel de margem por canal — SOMENTE LEITURA. Mostra o lucro líquido do
 * produto em cada canal (iFood, site PIX, site cartão), recalculado ao vivo
 * conforme o admin edita preço/CPV. Não é editável — é um espelho do que o
 * produto rende. Taxas em `lib/fees.ts`.
 *
 * Sem CPV (custo 0) → mostra aviso, não inventa número.
 */
function MarginPanel({
  priceSite,
  priceIfood,
  cost,
}: {
  priceSite: number;
  priceIfood: number;
  cost: number;
}) {
  const hasCost = cost > 0;
  const m = marginByChannel({
    priceSite: Number.isFinite(priceSite) ? priceSite : 0,
    priceIfood: Number.isFinite(priceIfood) ? priceIfood : 0,
    cost: Number.isFinite(cost) ? cost : 0,
  });

  return (
    <div className="flex flex-col gap-2 rounded-sm border border-divider bg-paper-100/60 p-4">
      <div className="flex items-center justify-between">
        <span className="text-body-sm font-semibold text-olive-900">Margem por canal</span>
        <span className="text-micro text-olive-700">somente leitura · lucro por unidade</span>
      </div>

      {!hasCost ? (
        <p className="text-caption text-olive-700">
          Cadastre o <strong>Custo / CPV</strong> acima pra ver a margem de lucro em cada canal.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <MarginStat icon={Bike} label="iFood" tone="terra" m={m.ifood} />
          <MarginStat icon={Store} label="Site · PIX" tone="leaf" m={m.pix} />
          <MarginStat icon={Store} label="Site · Cartão" tone="leaf" m={m.card} />
        </div>
      )}
    </div>
  );
}

function MarginStat({
  icon: Icon,
  label,
  tone,
  m,
}: {
  icon: React.ElementType;
  label: string;
  tone: "leaf" | "terra";
  m: ChannelMargin;
}) {
  const pct = m.pct === null ? "—" : `${Math.round(m.pct * 100)}%`;
  const profit = m.profit === null ? "—" : `${formatBRL(m.profit)}/un`;
  return (
    <div className="flex flex-col gap-1 rounded-sm border border-divider bg-paper-50 px-3 py-2">
      <div
        className={cn(
          "flex items-center gap-1.5 text-micro font-semibold tracking-wide uppercase",
          tone === "leaf" ? "text-leaf-700" : "text-terra-700",
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        {label}
      </div>
      <span className="text-h4 font-bold text-olive-900 tabular-nums">{pct}</span>
      <span className="text-caption text-olive-700 tabular-nums">{profit} de lucro</span>
    </div>
  );
}

/**
 * Input monetário — prefixo "R$" fixo dentro do campo, à esquerda, pra o
 * número não ficar "solto". Compatível com RHF (forwardRef + spread). Mantém
 * type=number (step 0,01) pra teclado numérico e validação nativa.
 */
const MoneyInput = forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<typeof Input>>(
  function MoneyInput({ hasError, className, ...rest }, ref) {
    return (
      <div className="relative">
        <span
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-body-sm text-olive-700"
          aria-hidden="true"
        >
          R$
        </span>
        <Input
          ref={ref}
          type="number"
          step="0.01"
          min={0}
          inputMode="decimal"
          hasError={hasError}
          className={cn("pl-9", className)}
          {...rest}
        />
      </div>
    );
  },
);
