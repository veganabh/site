"use client";

import { useEffect, useState, useTransition } from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import type { Coupon } from "@/types/coupon";
import { useAdminCouponsStore } from "@/stores/admin-coupons-store";
import { createCouponAction, updateCouponAction } from "@/server/actions/coupons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    control,
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent size="md" aria-describedby="form-description">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar cupom" : "Novo cupom"}</DialogTitle>
          <DialogDescription id="form-description">
            {isEditing ? "Edite os dados do cupom abaixo." : "Preencha os dados do cupom abaixo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="code" className={labelClass}>
                Código do cupom
              </label>
              <Input
                id="code"
                type="text"
                placeholder="ex: VEGANA10"
                aria-describedby={errors.code ? "code-error" : undefined}
                aria-invalid={!!errors.code}
                hasError={!!errors.code}
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
              <Input
                id="label"
                type="text"
                placeholder="Igual ao código se deixar vazio"
                {...register("label")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="hint" className={labelClass}>
                Descrição do desconto
              </label>
              <Input
                id="hint"
                type="text"
                placeholder="ex: −10% no pedido"
                aria-describedby={errors.hint ? "hint-error" : undefined}
                aria-invalid={!!errors.hint}
                hasError={!!errors.hint}
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
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="type" hasError={!!errors.type}>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {watchedType !== "FRETE_GRATIS" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="value" className={labelClass}>
                  {watchedType === "PERCENTUAL" ? "Percentual (%)" : "Valor (R$)"}
                </label>
                <Input
                  id="value"
                  type="number"
                  min={0}
                  max={watchedType === "PERCENTUAL" ? 100 : undefined}
                  step={watchedType === "PERCENTUAL" ? 1 : 0.01}
                  placeholder={watchedType === "PERCENTUAL" ? "ex: 10" : "ex: 5.00"}
                  aria-describedby={errors.value ? "value-error" : undefined}
                  aria-invalid={!!errors.value}
                  hasError={!!errors.value}
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
              <Input
                id="minOrderValue"
                type="number"
                min={0}
                step={0.01}
                placeholder="Sem mínimo"
                {...register("minOrderValue")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="maxUses" className={labelClass}>
                Limite de usos
              </label>
              <Input
                id="maxUses"
                type="number"
                min={1}
                step={1}
                placeholder="Ilimitado"
                {...register("maxUses")}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="validFrom" className={labelClass}>
                  Válido a partir de
                </label>
                <Input
                  id="validFrom"
                  type="date"
                  aria-describedby={errors.validFrom ? "validFrom-error" : undefined}
                  aria-invalid={!!errors.validFrom}
                  hasError={!!errors.validFrom}
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
                <Input
                  id="validUntil"
                  type="date"
                  placeholder="Sem expiração"
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

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={pending}
              disabled={pending}
            >
              {isEditing ? "Atualizar cupom" : "Salvar cupom"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
