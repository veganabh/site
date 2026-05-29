"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMenuStore } from "@/stores/menu-store";
import { GIFT_KIT_ICON_NAMES, resolveKitIcon } from "@/lib/kit-icons";
import type { GiftKitIconName } from "@/lib/kit-icons";
import {
  createGiftKitAction,
  setGiftKitSlotsAction,
  updateGiftKitAction,
} from "@/server/actions/gift-kits";
import type { GiftKitTemplate } from "@/types/gift-kit";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, TextArea } from "@/components/ui/input";

// ── Schema Zod ─────────────────────────────────────────────────────────────────

const slotSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Nome do slot obrigatório"),
  helper: z.string().optional(),
  qty: z.string().min(1, "Quantidade obrigatória"),
  eligibleProductIds: z.array(z.string()).min(1, "Pelo menos 1 produto por slot"),
});

const kitFormSchema = z
  .object({
    name: z.string().min(1, "Nome obrigatório"),
    slug: z
      .string()
      .min(1, "Slug obrigatório")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: só letras minúsculas, números e hífens"),
    tagline: z.string().max(80, "Máximo 80 caracteres"),
    description: z.string().min(1, "Descrição obrigatória"),
    iconName: z.enum(GIFT_KIT_ICON_NAMES as unknown as [string, ...string[]]),
    coverPhotoUrl: z.string().min(1, "URL da foto obrigatória"),
    coverPhotoAlt: z.string().min(1, "Alt text obrigatório"),
    price: z.string().min(1, "Preço obrigatório"),
    priceIfoodAnchor: z.string().min(1, "Preço âncora obrigatório"),
    slots: z.array(slotSchema).min(1, "Pelo menos 1 slot"),
  })
  .refine(
    (data) => {
      const p = parseFloat(data.price);
      return !isNaN(p) && p > 0;
    },
    { message: "Preço deve ser maior que zero.", path: ["price"] },
  )
  .refine(
    (data) => {
      const p = parseFloat(data.price);
      const a = parseFloat(data.priceIfoodAnchor);
      return !isNaN(a) && a > p;
    },
    { message: "Âncora iFood deve ser maior que o preço do kit.", path: ["priceIfoodAnchor"] },
  );

type KitFormData = z.infer<typeof kitFormSchema>;

// ── Tipos ──────────────────────────────────────────────────────────────────────

type KitFormDialogProps = {
  open: boolean;
  /** Se passado = modo edição. Ausente = modo criação. */
  kit?: GiftKitTemplate;
  onClose: () => void;
};

// ── Helpers de estilo ─────────────────────────────────────────────────────────

const labelClass = "text-body-sm font-medium text-olive-900";

const sectionHeadingClass = "text-body font-semibold text-olive-900 border-b border-divider pb-2";

// inputClass local para <select> (não coberto pelo primitivo Input)
const selectClass =
  "h-11 w-full rounded-sm border border-divider bg-paper-50 px-3 text-body-sm text-olive-900 outline-none transition focus:ring-2 focus:ring-olive-900/20 cursor-pointer";

// ── Helper: gerar slug a partir do nome ───────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Helper: valores padrão de formulário ──────────────────────────────────────

function kitToFormDefaults(kit: GiftKitTemplate): KitFormData {
  return {
    name: kit.name,
    slug: kit.slug,
    tagline: kit.tagline,
    description: kit.description,
    iconName: kit.iconName,
    coverPhotoUrl: kit.coverPhoto.url,
    coverPhotoAlt: kit.coverPhoto.alt,
    price: String(kit.price),
    priceIfoodAnchor: String(kit.priceIfoodAnchor),
    slots: kit.slots.map((s) => ({
      id: s.id,
      label: s.label,
      helper: s.helper ?? "",
      qty: String(s.qty),
      eligibleProductIds: [...s.eligibleProductIds],
    })),
  };
}

const EMPTY_DEFAULTS: KitFormData = {
  name: "",
  slug: "",
  tagline: "",
  description: "",
  iconName: "Gift",
  coverPhotoUrl: "",
  coverPhotoAlt: "",
  price: "",
  priceIfoodAnchor: "",
  slots: [
    {
      id: crypto.randomUUID(),
      label: "",
      helper: "",
      qty: "1",
      eligibleProductIds: [],
    },
  ],
};

// ── Componente ────────────────────────────────────────────────────────────────

export function KitFormDialog({ open, kit, onClose }: KitFormDialogProps) {
  const isEditing = !!kit;
  const products = useMenuStore((s) => s.products);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<KitFormData>({
    resolver: zodResolver(kitFormSchema),
    defaultValues: isEditing ? kitToFormDefaults(kit) : EMPTY_DEFAULTS,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "slots" });

  // Re-popular form ao abrir
  useEffect(() => {
    if (open) {
      reset(isEditing ? kitToFormDefaults(kit) : { ...EMPTY_DEFAULTS });
    }
  }, [open, kit, isEditing, reset]);

  const watchedName = watch("name");
  const watchedPrice = watch("price");
  const watchedAnchor = watch("priceIfoodAnchor");
  const watchedIconName = watch("iconName") as GiftKitIconName;

  // Auto-gera slug ao digitar nome (só em criação)
  useEffect(() => {
    if (!isEditing && watchedName) {
      setValue("slug", slugify(watchedName), { shouldValidate: false });
    }
  }, [watchedName, isEditing, setValue]);

  // Economia calculada em tempo real
  const economy = (() => {
    const p = parseFloat(watchedPrice);
    const a = parseFloat(watchedAnchor);
    if (!isNaN(p) && !isNaN(a) && a > p) {
      return (a - p).toFixed(2).replace(".", ",");
    }
    return null;
  })();

  const KitIcon = resolveKitIcon(watchedIconName ?? "Gift");

  async function onSubmit(data: KitFormData) {
    setSubmitError(null);
    const parsedPrice = parseFloat(data.price);
    const parsedAnchor = parseFloat(data.priceIfoodAnchor);
    const slotsPayload = data.slots.map((s) => ({
      label: s.label,
      helper: s.helper || undefined,
      qty: parseInt(s.qty, 10),
      eligibleProductIds: s.eligibleProductIds,
    }));

    if (isEditing) {
      const updateResult = await updateGiftKitAction(kit.id, {
        slug: data.slug,
        name: data.name,
        tagline: data.tagline,
        description: data.description,
        iconName: data.iconName as GiftKitIconName,
        coverPhotoUrl: data.coverPhotoUrl,
        coverPhotoAlt: data.coverPhotoAlt,
        price: parsedPrice,
        priceIfoodAnchor: parsedAnchor,
      });
      if (!updateResult.ok) {
        if (updateResult.message.toLowerCase().includes("slug")) {
          setError("slug", { message: updateResult.message });
        } else {
          setSubmitError(updateResult.message);
        }
        return;
      }
      const slotsResult = await setGiftKitSlotsAction(kit.id, slotsPayload);
      if (!slotsResult.ok) {
        setSubmitError(slotsResult.message);
        return;
      }
      onClose();
      return;
    }

    const createResult = await createGiftKitAction({
      slug: data.slug,
      name: data.name,
      tagline: data.tagline,
      description: data.description,
      iconName: data.iconName as GiftKitIconName,
      coverPhotoUrl: data.coverPhotoUrl,
      coverPhotoAlt: data.coverPhotoAlt,
      price: parsedPrice,
      priceIfoodAnchor: parsedAnchor,
      active: true,
      slots: slotsPayload,
    });
    if (!createResult.ok) {
      if (createResult.message.toLowerCase().includes("slug")) {
        setError("slug", { message: createResult.message });
      } else {
        setSubmitError(createResult.message);
      }
      return;
    }
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent size="lg" aria-describedby="kit-form-description">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-divider px-6 py-4">
          <div>
            <DialogTitle>{isEditing ? "Editar kit" : "Novo kit"}</DialogTitle>
            <DialogDescription id="kit-form-description">
              {isEditing
                ? "Edite os dados do template de kit abaixo."
                : "Preencha os dados do novo template de kit."}
            </DialogDescription>
          </div>
          <DialogClose
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-olive-700 transition hover:bg-paper-100 hover:text-olive-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </DialogClose>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto px-6 py-5">
            {/* ── Seção Identidade ──────────────────────────────────────── */}
            <section aria-labelledby="section-identidade">
              <h3 id="section-identidade" className={sectionHeadingClass}>
                Identidade
              </h3>

              <div className="mt-4 flex flex-col gap-4">
                {/* Nome */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="kit-name" className={labelClass}>
                    Nome do kit
                  </label>
                  <Input
                    id="kit-name"
                    type="text"
                    placeholder="ex: Kit Presente Individual"
                    aria-describedby={errors.name ? "kit-name-error" : undefined}
                    aria-invalid={!!errors.name}
                    hasError={!!errors.name}
                    {...register("name")}
                  />
                  {errors.name && (
                    <p id="kit-name-error" role="alert" className="mt-1 text-caption text-error">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Slug */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="kit-slug" className={labelClass}>
                    Slug
                  </label>
                  <Input
                    id="kit-slug"
                    type="text"
                    placeholder="ex: kit-individual"
                    aria-describedby={errors.slug ? "kit-slug-error" : "kit-slug-hint"}
                    aria-invalid={!!errors.slug}
                    hasError={!!errors.slug}
                    {...register("slug")}
                  />
                  {errors.slug ? (
                    <p id="kit-slug-error" role="alert" className="mt-1 text-caption text-error">
                      {errors.slug.message}
                    </p>
                  ) : (
                    <p id="kit-slug-hint" className="mt-1 text-caption text-olive-700">
                      Gerado automaticamente. Só letras minúsculas, números e hífens.
                    </p>
                  )}
                </div>

                {/* Tagline */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="kit-tagline" className={labelClass}>
                    Tagline{" "}
                    <span className="text-caption font-normal text-olive-700">(máx. 80 char)</span>
                  </label>
                  <Input
                    id="kit-tagline"
                    type="text"
                    placeholder="ex: Pra quem você gosta — e só."
                    maxLength={80}
                    aria-describedby={errors.tagline ? "kit-tagline-error" : undefined}
                    aria-invalid={!!errors.tagline}
                    hasError={!!errors.tagline}
                    {...register("tagline")}
                  />
                  {errors.tagline && (
                    <p id="kit-tagline-error" role="alert" className="mt-1 text-caption text-error">
                      {errors.tagline.message}
                    </p>
                  )}
                </div>

                {/* Descrição */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="kit-description" className={labelClass}>
                    Descrição
                  </label>
                  <TextArea
                    id="kit-description"
                    rows={4}
                    placeholder="Até 2 parágrafos descrevendo o kit e para quem é."
                    aria-describedby={errors.description ? "kit-description-error" : undefined}
                    aria-invalid={!!errors.description}
                    hasError={!!errors.description}
                    className="resize-y"
                    {...register("description")}
                  />
                  {errors.description && (
                    <p
                      id="kit-description-error"
                      role="alert"
                      className="mt-1 text-caption text-error"
                    >
                      {errors.description.message}
                    </p>
                  )}
                </div>

                {/* Ícone */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="kit-icon" className={labelClass}>
                    Ícone
                  </label>
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-divider bg-paper-100"
                      aria-hidden="true"
                    >
                      <KitIcon className="h-5 w-5 text-olive-900" strokeWidth={1.75} />
                    </span>
                    <select id="kit-icon" className={selectClass} {...register("iconName")}>
                      {GIFT_KIT_ICON_NAMES.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Foto de capa */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="kit-cover-url" className={labelClass}>
                      URL da foto de capa
                    </label>
                    <Input
                      id="kit-cover-url"
                      type="text"
                      placeholder="/produtos/nome-da-foto.png"
                      aria-describedby={errors.coverPhotoUrl ? "kit-cover-url-error" : undefined}
                      aria-invalid={!!errors.coverPhotoUrl}
                      hasError={!!errors.coverPhotoUrl}
                      {...register("coverPhotoUrl")}
                    />
                    {errors.coverPhotoUrl && (
                      <p
                        id="kit-cover-url-error"
                        role="alert"
                        className="mt-1 text-caption text-error"
                      >
                        {errors.coverPhotoUrl.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="kit-cover-alt" className={labelClass}>
                      Alt text da foto
                    </label>
                    <Input
                      id="kit-cover-alt"
                      type="text"
                      placeholder="Descrição acessível da imagem"
                      aria-describedby={errors.coverPhotoAlt ? "kit-cover-alt-error" : undefined}
                      aria-invalid={!!errors.coverPhotoAlt}
                      hasError={!!errors.coverPhotoAlt}
                      {...register("coverPhotoAlt")}
                    />
                    {errors.coverPhotoAlt && (
                      <p
                        id="kit-cover-alt-error"
                        role="alert"
                        className="mt-1 text-caption text-error"
                      >
                        {errors.coverPhotoAlt.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Seção Preço ───────────────────────────────────────────── */}
            <section aria-labelledby="section-preco">
              <h3 id="section-preco" className={sectionHeadingClass}>
                Preço
              </h3>

              <div className="mt-4 grid grid-cols-2 gap-4">
                {/* Preço do kit */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="kit-price" className={labelClass}>
                    Preço do kit (R$)
                  </label>
                  <Input
                    id="kit-price"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="ex: 31.90"
                    aria-describedby={errors.price ? "kit-price-error" : undefined}
                    aria-invalid={!!errors.price}
                    hasError={!!errors.price}
                    {...register("price")}
                  />
                  {errors.price && (
                    <p id="kit-price-error" role="alert" className="mt-1 text-caption text-error">
                      {errors.price.message}
                    </p>
                  )}
                </div>

                {/* Âncora iFood */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="kit-anchor" className={labelClass}>
                    Âncora iFood (R$)
                  </label>
                  <Input
                    id="kit-anchor"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="ex: 42.00"
                    aria-describedby={errors.priceIfoodAnchor ? "kit-anchor-error" : undefined}
                    aria-invalid={!!errors.priceIfoodAnchor}
                    hasError={!!errors.priceIfoodAnchor}
                    {...register("priceIfoodAnchor")}
                  />
                  {errors.priceIfoodAnchor && (
                    <p id="kit-anchor-error" role="alert" className="mt-1 text-caption text-error">
                      {errors.priceIfoodAnchor.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Economia calculada */}
              {economy && (
                <p className="mt-2 text-body-sm font-semibold text-leaf-700">
                  Economia de R$&nbsp;{economy} em relação ao iFood.
                </p>
              )}
            </section>

            {/* ── Seção Slots ───────────────────────────────────────────── */}
            <section aria-labelledby="section-slots">
              <h3 id="section-slots" className={sectionHeadingClass}>
                Slots
              </h3>

              {errors.slots?.root && (
                <p role="alert" className="mt-2 text-caption text-error">
                  {errors.slots.root.message}
                </p>
              )}

              <div className="mt-4 flex flex-col gap-4">
                {fields.map((field, idx) => {
                  const slotErrors = errors.slots?.[idx];
                  const watchedIds = watch(`slots.${idx}.eligibleProductIds`) ?? [];

                  return (
                    <div
                      key={field.id}
                      className="rounded-sm border border-divider bg-paper-100/50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-body-sm font-semibold text-olive-900">
                          Slot {idx + 1}
                        </span>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(idx)}
                            aria-label={`Remover slot ${idx + 1}`}
                            className="flex h-7 w-7 items-center justify-center rounded-sm text-olive-700 transition hover:bg-paper-100 hover:text-terra-700"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      <input type="hidden" {...register(`slots.${idx}.id`)} />

                      <div className="flex flex-col gap-3">
                        {/* Label do slot */}
                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor={`slot-${idx}-label`}
                            className="text-body-sm font-medium text-olive-900"
                          >
                            Nome do slot
                          </label>
                          <Input
                            id={`slot-${idx}-label`}
                            type="text"
                            placeholder="ex: Escolha o bolo no pote"
                            aria-describedby={
                              slotErrors?.label ? `slot-${idx}-label-error` : undefined
                            }
                            aria-invalid={!!slotErrors?.label}
                            hasError={!!slotErrors?.label}
                            {...register(`slots.${idx}.label`)}
                          />
                          {slotErrors?.label && (
                            <p
                              id={`slot-${idx}-label-error`}
                              role="alert"
                              className="mt-1 text-caption text-error"
                            >
                              {slotErrors.label.message}
                            </p>
                          )}
                        </div>

                        {/* Helper + Qty na mesma linha */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2 flex flex-col gap-1.5">
                            <label
                              htmlFor={`slot-${idx}-helper`}
                              className="text-body-sm font-medium text-olive-900"
                            >
                              Texto auxiliar{" "}
                              <span className="text-caption font-normal text-olive-700">
                                (opcional)
                              </span>
                            </label>
                            <Input
                              id={`slot-${idx}-helper`}
                              type="text"
                              placeholder="ex: 230g · pronto pra comer"
                              {...register(`slots.${idx}.helper`)}
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label
                              htmlFor={`slot-${idx}-qty`}
                              className="text-body-sm font-medium text-olive-900"
                            >
                              Qtd.
                            </label>
                            <Input
                              id={`slot-${idx}-qty`}
                              type="number"
                              min={1}
                              step={1}
                              placeholder="1"
                              aria-describedby={
                                slotErrors?.qty ? `slot-${idx}-qty-error` : undefined
                              }
                              aria-invalid={!!slotErrors?.qty}
                              hasError={!!slotErrors?.qty}
                              {...register(`slots.${idx}.qty`)}
                            />
                            {slotErrors?.qty && (
                              <p
                                id={`slot-${idx}-qty-error`}
                                role="alert"
                                className="mt-1 text-caption text-error"
                              >
                                {slotErrors.qty.message}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Produtos elegíveis */}
                        <div className="flex flex-col gap-1.5">
                          <span
                            className="text-body-sm font-medium text-olive-900"
                            id={`slot-${idx}-products-label`}
                          >
                            Produtos elegíveis
                          </span>
                          {slotErrors?.eligibleProductIds && (
                            <p
                              id={`slot-${idx}-products-error`}
                              role="alert"
                              className="text-caption text-error"
                            >
                              {slotErrors.eligibleProductIds.message}
                            </p>
                          )}
                          <div
                            role="group"
                            aria-labelledby={`slot-${idx}-products-label`}
                            aria-describedby={
                              slotErrors?.eligibleProductIds
                                ? `slot-${idx}-products-error`
                                : undefined
                            }
                            className="grid grid-cols-2 gap-1.5 sm:grid-cols-3"
                          >
                            {products.map((product) => {
                              const checked = watchedIds.includes(product.id);
                              return (
                                <label
                                  key={product.id}
                                  className={cn(
                                    "flex cursor-pointer items-center gap-2 rounded-sm border px-2.5 py-2 text-caption transition",
                                    checked
                                      ? "border-olive-500 bg-olive-900/5 text-olive-900"
                                      : "border-divider bg-paper-50 text-olive-700 hover:bg-paper-100",
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    value={product.id}
                                    checked={checked}
                                    onChange={(e) => {
                                      const current = watch(
                                        `slots.${idx}.eligibleProductIds`,
                                      ) as string[];
                                      if (e.target.checked) {
                                        setValue(`slots.${idx}.eligibleProductIds`, [
                                          ...current,
                                          product.id,
                                        ]);
                                      } else {
                                        setValue(
                                          `slots.${idx}.eligibleProductIds`,
                                          current.filter((id) => id !== product.id),
                                        );
                                      }
                                    }}
                                  />
                                  <span className="truncate">{product.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Botão Adicionar slot */}
                <button
                  type="button"
                  onClick={() =>
                    append({
                      id: crypto.randomUUID(),
                      label: "",
                      helper: "",
                      qty: "1",
                      eligibleProductIds: [],
                    })
                  }
                  className="flex h-9 items-center gap-2 rounded-sm border border-dashed border-divider bg-paper-50 px-4 text-body-sm font-medium text-olive-700 transition hover:border-olive-500 hover:text-olive-900"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Adicionar slot
                </button>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-2 border-t border-divider px-6 py-4">
            {submitError && (
              <p role="alert" className="text-caption text-error">
                {submitError}
              </p>
            )}
            <DialogFooter className="border-none p-0">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                {isEditing ? "Atualizar kit" : "Salvar kit"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
