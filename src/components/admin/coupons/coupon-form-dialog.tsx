"use client";

import { useEffect, useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import type { Coupon } from "@/types/coupon";
import { useAdminCouponsStore } from "@/stores/admin-coupons-store";
import { createCouponAction, updateCouponAction } from "@/server/actions/coupons";

// ── Schema Zod ─────────────────────────────────────────────────────────────────

const couponFormSchema = z
  .object({
    code: z.string().min(1, "Código obrigatório"),
    label: z.string().optional(),
    hint: z.string().min(1, "Descrição obrigatória"),
    type: z.enum(["PERCENTUAL", "FIXO", "FRETE_GRATIS"]),
    value: z.string().optional(),
    minOrderValue: z.string().optional(),
    maxUses: z.string().optional(),
    validFrom: z.string().min(1, "Data de início obrigatória"),
    validUntil: z.string().optional(),
    status: z.enum(["ATIVO", "INATIVO"]),
  })
  .refine(
    (data) => {
      if (data.type === "FRETE_GRATIS") return true;
      const v = parseFloat(data.value ?? "");
      return !isNaN(v) && v > 0;
    },
    { message: "Informe o valor do desconto.", path: ["value"] },
  )
  .refine(
    (data) => {
      if (data.type !== "PERCENTUAL") return true;
      const v = parseFloat(data.value ?? "");
      return !isNaN(v) && v <= 100;
    },
    { message: "Percentual deve ser entre 1 e 100.", path: ["value"] },
  );

type CouponFormData = z.infer<typeof couponFormSchema>;

type CouponFormDialogProps = {
  open: boolean;
  /** Se passado = modo edição. Ausente = modo criação. */
  coupon?: Coupon;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

const inputClass =
  "h-9 w-full rounded-md border border-divider bg-paper-50 px-3 text-body-sm text-olive-900 placeholder:text-olive-700/50 focus:border-olive-500 focus:outline-none";

const labelClass = "text-body-sm font-medium text-olive-900";

export function CouponFormDialog({
  open,
  coupon,
  onClose,
  onSuccess,
  onError,
}: CouponFormDialogProps) {
  const isEditing = !!coupon;
  const applyOptimisticUpdate = useAdminCouponsStore((s) => s.applyOptimisticUpdate);
  const setCoupons = useAdminCouponsStore((s) => s.setCoupons);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<CouponFormData>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: isEditing
      ? {
          code: coupon.code,
          label: coupon.label ?? "",
          hint: coupon.hint,
          type: coupon.type,
          value: coupon.type !== "FRETE_GRATIS" ? String(coupon.value) : "",
          minOrderValue: coupon.minOrderValue !== undefined ? String(coupon.minOrderValue) : "",
          maxUses: coupon.maxUses !== undefined ? String(coupon.maxUses) : "",
          validFrom: coupon.validFrom,
          validUntil: coupon.validUntil ?? "",
          status: coupon.status === "EXPIRADO" ? "ATIVO" : coupon.status,
        }
      : {
          type: "PERCENTUAL" as const,
          status: "ATIVO" as const,
          validFrom: new Date().toISOString().split("T")[0],
          value: "",
          minOrderValue: "",
          maxUses: "",
          validUntil: "",
          label: "",
          hint: "",
          code: "",
        },
  });

  useEffect(() => {
    if (open) {
      setServerError(null);
      reset(
        isEditing
          ? {
              code: coupon.code,
              label: coupon.label ?? "",
              hint: coupon.hint,
              type: coupon.type,
              value: coupon.type !== "FRETE_GRATIS" ? String(coupon.value) : "",
              minOrderValue: coupon.minOrderValue !== undefined ? String(coupon.minOrderValue) : "",
              maxUses: coupon.maxUses !== undefined ? String(coupon.maxUses) : "",
              validFrom: coupon.validFrom,
              validUntil: coupon.validUntil ?? "",
              status: coupon.status === "EXPIRADO" ? "ATIVO" : coupon.status,
            }
          : {
              type: "PERCENTUAL" as const,
              status: "ATIVO" as const,
              validFrom: new Date().toISOString().split("T")[0],
              value: "",
              minOrderValue: "",
              maxUses: "",
              validUntil: "",
              label: "",
              hint: "",
              code: "",
            },
      );
    }
  }, [open, coupon, isEditing, reset]);

  const watchedType = watch("type");
  const watchedStatus = watch("status");

  function onSubmit(data: CouponFormData) {
    setServerError(null);
    const normalizedCode = data.code.toUpperCase().trim();
    const parsedValue = data.type === "FRETE_GRATIS" ? 0 : parseFloat(data.value ?? "0");
    const parsedMin =
      data.minOrderValue && data.minOrderValue !== "" ? parseFloat(data.minOrderValue) : undefined;
    const parsedMax = data.maxUses && data.maxUses !== "" ? parseInt(data.maxUses, 10) : undefined;

    const payload = {
      code: normalizedCode,
      label: data.label || normalizedCode,
      hint: data.hint,
      type: data.type,
      value: isNaN(parsedValue) ? 0 : parsedValue,
      minOrderValue: parsedMin,
      maxUses: parsedMax,
      validFrom: data.validFrom,
      validUntil: data.validUntil || undefined,
      status: data.status,
    } as const;

    if (isEditing) {
      const snapshot = useAdminCouponsStore.getState().coupons;
      applyOptimisticUpdate(coupon.id, {
        code: normalizedCode,
        label: payload.label,
        hint: payload.hint,
        type: payload.type,
        value: payload.value,
        minOrderValue: payload.minOrderValue,
        maxUses: payload.maxUses,
        validFrom: payload.validFrom,
        validUntil: payload.validUntil,
        status: payload.status,
      });

      startTransition(async () => {
        const result = await updateCouponAction(coupon.id, payload);
        if (!result.ok) {
          setCoupons(snapshot);
          if (result.fieldErrors) {
            for (const [field, msgs] of Object.entries(result.fieldErrors)) {
              if (msgs && msgs[0]) {
                setError(field as keyof CouponFormData, { message: msgs[0] });
              }
            }
          }
          setServerError(result.message);
          onError(result.message);
          return;
        }
        onSuccess(`Cupom ${normalizedCode} atualizado.`);
        onClose();
      });
    } else {
      startTransition(async () => {
        const result = await createCouponAction(payload);
        if (!result.ok) {
          if (result.fieldErrors) {
            for (const [field, msgs] of Object.entries(result.fieldErrors)) {
              if (msgs && msgs[0]) {
                setError(field as keyof CouponFormData, { message: msgs[0] });
              }
            }
          }
          setServerError(result.message);
          onError(result.message);
          return;
        }
        onSuccess(`Cupom ${normalizedCode} criado.`);
        onClose();
      });
    }
  }

  const typeOptions = [
    { value: "PERCENTUAL", label: "Percentual (%)" },
    { value: "FIXO", label: "Valor fixo (R$)" },
    { value: "FRETE_GRATIS", label: "Frete grátis" },
  ] as const;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-olive-900/40 backdrop-blur-sm" />

        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-paper-50 shadow-lg focus:outline-none"
          aria-describedby="form-description"
        >
          <div className="border-b border-divider px-6 py-4">
            <Dialog.Title className="text-h3 font-bold text-olive-900">
              {isEditing ? "Editar cupom" : "Novo cupom"}
            </Dialog.Title>
            <Dialog.Description
              id="form-description"
              className="mt-0.5 text-body-sm text-olive-700"
            >
              {isEditing ? "Edite os dados do cupom abaixo." : "Preencha os dados do cupom abaixo."}
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto px-6 py-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="code" className={labelClass}>
                  Código do cupom
                </label>
                <input
                  id="code"
                  type="text"
                  placeholder="ex: VEGANA10"
                  aria-describedby={errors.code ? "code-error" : undefined}
                  aria-invalid={!!errors.code}
                  className={cn(inputClass, errors.code && "border-error")}
                  {...register("code", {
                    onChange: (e) => {
                      e.target.value = e.target.value.toUpperCase();
                    },
                  })}
                />
                {errors.code && (
                  <p id="code-error" role="alert" className="mt-1 text-caption text-error">
                    {errors.code.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="label" className={labelClass}>
                  Rótulo (exibido no chip)
                </label>
                <input
                  id="label"
                  type="text"
                  placeholder="Igual ao código se deixar vazio"
                  className={inputClass}
                  {...register("label")}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="hint" className={labelClass}>
                  Descrição do desconto
                </label>
                <input
                  id="hint"
                  type="text"
                  placeholder="ex: −10% no pedido"
                  aria-describedby={errors.hint ? "hint-error" : undefined}
                  aria-invalid={!!errors.hint}
                  className={cn(inputClass, errors.hint && "border-error")}
                  {...register("hint")}
                />
                {errors.hint && (
                  <p id="hint-error" role="alert" className="mt-1 text-caption text-error">
                    {errors.hint.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="type" className={labelClass}>
                  Tipo de desconto
                </label>
                <select
                  id="type"
                  className={cn(inputClass, "cursor-pointer")}
                  {...register("type")}
                >
                  {typeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {watchedType !== "FRETE_GRATIS" && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="value" className={labelClass}>
                    {watchedType === "PERCENTUAL" ? "Percentual (%)" : "Valor (R$)"}
                  </label>
                  <input
                    id="value"
                    type="number"
                    min={0}
                    max={watchedType === "PERCENTUAL" ? 100 : undefined}
                    step={watchedType === "PERCENTUAL" ? 1 : 0.01}
                    placeholder={watchedType === "PERCENTUAL" ? "ex: 10" : "ex: 5.00"}
                    aria-describedby={errors.value ? "value-error" : undefined}
                    aria-invalid={!!errors.value}
                    className={cn(inputClass, errors.value && "border-error")}
                    {...register("value")}
                  />
                  {errors.value && (
                    <p id="value-error" role="alert" className="mt-1 text-caption text-error">
                      {errors.value.message}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="minOrderValue" className={labelClass}>
                  Valor mínimo do pedido (R$)
                </label>
                <input
                  id="minOrderValue"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="Sem mínimo"
                  className={inputClass}
                  {...register("minOrderValue")}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="maxUses" className={labelClass}>
                  Limite de usos
                </label>
                <input
                  id="maxUses"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Ilimitado"
                  className={inputClass}
                  {...register("maxUses")}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="validFrom" className={labelClass}>
                    Válido a partir de
                  </label>
                  <input
                    id="validFrom"
                    type="date"
                    aria-describedby={errors.validFrom ? "validFrom-error" : undefined}
                    aria-invalid={!!errors.validFrom}
                    className={cn(inputClass, errors.validFrom && "border-error")}
                    {...register("validFrom")}
                  />
                  {errors.validFrom && (
                    <p id="validFrom-error" role="alert" className="mt-1 text-caption text-error">
                      {errors.validFrom.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="validUntil" className={labelClass}>
                    Válido até
                  </label>
                  <input
                    id="validUntil"
                    type="date"
                    placeholder="Sem expiração"
                    className={inputClass}
                    {...register("validUntil")}
                  />
                </div>
              </div>

              {!isEditing && (
                <div className="flex flex-col gap-2">
                  <span className={cn(labelClass, "block")} id="status-label">
                    Status inicial
                  </span>
                  <RadioGroup.Root
                    value={watchedStatus}
                    onValueChange={(v) => setValue("status", v as "ATIVO" | "INATIVO")}
                    aria-labelledby="status-label"
                    className="flex gap-4"
                  >
                    {(["ATIVO", "INATIVO"] as const).map((s) => (
                      <label
                        key={s}
                        htmlFor={`status-${s}`}
                        className="flex cursor-pointer items-center gap-2 text-body-sm text-olive-900"
                      >
                        <RadioGroup.Item
                          id={`status-${s}`}
                          value={s}
                          className="flex h-4 w-4 items-center justify-center rounded-full border border-divider bg-paper-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 data-[state=checked]:border-olive-900 data-[state=checked]:bg-olive-900"
                        >
                          <RadioGroup.Indicator className="block h-1.5 w-1.5 rounded-full bg-paper-50" />
                        </RadioGroup.Item>
                        {s === "ATIVO" ? "Ativo" : "Inativo"}
                      </label>
                    ))}
                  </RadioGroup.Root>
                </div>
              )}

              {serverError && (
                <p
                  role="alert"
                  className="rounded-sm border border-terra-500 bg-terra-500/10 px-3 py-2 text-body-sm text-terra-700"
                >
                  {serverError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-divider px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="inline-flex h-9 items-center rounded-md border border-divider bg-paper-50 px-4 text-body-sm font-semibold text-olive-900 transition hover:bg-paper-100 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-9 items-center rounded-md bg-olive-900 px-4 text-body-sm font-semibold text-paper-50 transition hover:bg-olive-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending
                  ? "Salvando..."
                  : isEditing
                    ? "Atualizar cupom"
                    : "Salvar cupom"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
