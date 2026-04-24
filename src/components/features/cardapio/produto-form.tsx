"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { useMenuStore } from "@/stores/menu-store";
import { PRODUCT_CATEGORIES } from "@/types/product";
import type { Product } from "@/types/product";
import { CATEGORY_LABELS } from "@/components/features/cardapio/category-labels";
import { cn } from "@/lib/utils";

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

const produtoSchema = z.object({
  name: z.string().min(2, "Nome precisa ter pelo menos 2 caracteres."),
  description: z.string().min(10, "Descrição muito curta."),
  category: z.enum(PRODUCT_CATEGORIES),
  gramatura_g: positiveNum("Informe a gramatura.", 0),
  price_site: positiveNum("Preço inválido."),
  price_ifood: positiveNum("Preço iFood inválido."),
  photo_url: z.string().optional(),
  photo_alt: z.string().optional(),
  active: z.boolean(),
  stock: nonNegativeNum("Estoque não pode ser negativo."),
  lowStockThreshold: positiveNum("Alerta precisa ser pelo menos 1.", 0),
});

type ProdutoFormValues = z.infer<typeof produtoSchema>;

type ProdutoFormProps = { mode: "novo" } | { mode: "editar"; product: Product };

// ──────────────────────────────────────────────────────────────────────────

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ProdutoForm(props: ProdutoFormProps) {
  const router = useRouter();
  const { addProduct, updateProduct } = useMenuStore();

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
          photo_url: props.product.photo.url,
          photo_alt: props.product.photo.alt,
          active: props.product.active,
          stock: String(props.product.stock),
          lowStockThreshold: String(props.product.lowStockThreshold),
        }
      : {
          name: "",
          description: "",
          category: "bolo-no-pote",
          gramatura_g: "230",
          price_site: "",
          price_ifood: "",
          photo_url: "",
          photo_alt: "",
          active: true,
          stock: "0",
          lowStockThreshold: "3",
        };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoSchema),
    defaultValues,
  });

  const previewUrl = watch("photo_url");

  function onSubmit(values: ProdutoFormValues) {
    if (props.mode === "novo") {
      const newProduct: Product = {
        id: String(Date.now()),
        slug: toSlug(values.name),
        name: values.name,
        description: values.description,
        category: values.category,
        gramatura_g: Number(values.gramatura_g),
        price_site: Number(values.price_site),
        price_ifood: Number(values.price_ifood),
        attributes: ["sem-lactose", "vegano"] as const,
        tags: [],
        photo: {
          url: values.photo_url ?? "",
          alt: values.photo_alt ?? values.name,
        },
        active: values.active,
        stock: Number(values.stock),
        lowStockThreshold: Number(values.lowStockThreshold),
      };
      addProduct(newProduct);
    } else {
      updateProduct(props.product.id, {
        name: values.name,
        description: values.description,
        category: values.category,
        gramatura_g: Number(values.gramatura_g),
        price_site: Number(values.price_site),
        price_ifood: Number(values.price_ifood),
        photo: {
          url: values.photo_url ?? "",
          alt: values.photo_alt ?? values.name,
        },
        active: values.active,
        stock: Number(values.stock),
        lowStockThreshold: Number(values.lowStockThreshold),
      });
    }
    router.push("/gestao/cardapio");
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6 rounded-lg border border-divider bg-paper-50 p-5"
      noValidate
    >
      <Field label="Nome do produto" error={errors.name?.message}>
        <input
          {...register("name")}
          type="text"
          placeholder="Ex: Bolo no Pote — Brigadeiro"
          className={inputClass(!!errors.name)}
        />
      </Field>

      <Field label="Descrição" error={errors.description?.message}>
        <textarea
          {...register("description")}
          rows={3}
          placeholder="Descreva os ingredientes e o que torna este produto especial."
          className={cn(inputClass(!!errors.description), "resize-y")}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Categoria" error={errors.category?.message}>
          <select {...register("category")} className={inputClass(!!errors.category)}>
            {PRODUCT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Gramatura (g)" error={errors.gramatura_g?.message}>
          <input
            {...register("gramatura_g")}
            type="number"
            min={1}
            placeholder="230"
            className={inputClass(!!errors.gramatura_g)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Preço no site (R$)" error={errors.price_site?.message}>
          <input
            {...register("price_site")}
            type="number"
            step="0.01"
            min={0}
            placeholder="17.90"
            className={inputClass(!!errors.price_site)}
          />
        </Field>

        <Field label="Preço no iFood (R$)" error={errors.price_ifood?.message}>
          <input
            {...register("price_ifood")}
            type="number"
            step="0.01"
            min={0}
            placeholder="18.90"
            className={inputClass(!!errors.price_ifood)}
          />
        </Field>
      </div>

      {/* Estoque */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Estoque (unidades)"
          error={errors.stock?.message}
          hint="Quantidade disponível para venda. 0 = esgotado."
        >
          <input
            {...register("stock")}
            type="number"
            min={0}
            step={1}
            placeholder="0"
            className={inputClass(!!errors.stock)}
          />
        </Field>

        <Field
          label="Alerta de estoque baixo"
          error={errors.lowStockThreshold?.message}
          hint="Aviso aparece quando o estoque chegar neste número."
        >
          <input
            {...register("lowStockThreshold")}
            type="number"
            min={1}
            step={1}
            placeholder="3"
            className={inputClass(!!errors.lowStockThreshold)}
          />
        </Field>
      </div>

      <Field
        label="Foto (caminho ou URL)"
        error={errors.photo_url?.message}
        hint="Ex: /produtos/bolo-cenoura-brigadeiro.png — upload real em breve."
      >
        <input
          {...register("photo_url")}
          type="text"
          placeholder="/produtos/bolo-cenoura-brigadeiro.png"
          className={inputClass(!!errors.photo_url)}
        />
        {previewUrl && (
          <div className="relative mt-2 h-24 w-24 overflow-hidden rounded-md border border-divider bg-paper-100">
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
      </Field>

      <Field label="Texto alternativo da foto" error={errors.photo_alt?.message}>
        <input
          {...register("photo_alt")}
          type="text"
          placeholder="Bolo de cenoura com cobertura de brigadeiro em prato claro"
          className={inputClass(!!errors.photo_alt)}
        />
      </Field>

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

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-sm bg-olive-900 px-6 py-2.5 text-cta text-paper-50 transition hover:bg-olive-700 disabled:opacity-60"
        >
          {props.mode === "novo" ? "Adicionar produto" : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/gestao/cardapio")}
          className="rounded-sm border border-divider bg-paper-100 px-6 py-2.5 text-cta text-olive-900 transition hover:bg-paper-100"
        >
          Cancelar
        </button>
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

function inputClass(hasError: boolean) {
  return cn(
    "w-full rounded-sm border bg-paper-50 px-3 py-2.5 text-body-sm text-olive-900 outline-none transition",
    "placeholder:text-olive-500 focus:ring-2 focus:ring-olive-900/20",
    hasError ? "border-terra-500 focus:ring-terra-500/30" : "border-divider",
  );
}
