"use client";

/**
 * Formulário de checkout de encomenda.
 *
 * Fluxo:
 *  1. Seleciona quantidade
 *  2. Seleciona data (date-picker com lead mín/máx + dias cheios bloqueados)
 *  3. Seleciona hora (inteiros na janela permitida)
 *  4. Endereço de entrega (reutiliza o padrão do checkout diário)
 *  5. Método de pagamento (PIX ou Cartão)
 *  6. Valida valor mínimo
 *  7. Submete via placePreorderAction
 */

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarClock, Info } from "lucide-react";
import { useRouter } from "next/navigation";

import type { Product } from "@/types/product";
import type { PreorderSettings } from "@/types/store-settings";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { placePreorderAction } from "@/server/actions/place-preorder";

type PreorderCheckoutFormProps = {
  product: Product;
  settings: PreorderSettings;
  minDate: string;
  maxDate: string;
  /** Contagem de encomendas pagas por data — usado para mostrar aviso de capacidade. */
  capacityMap: Record<string, number>;
};

// ── Schema de validação ────────────────────────────────────────────────────────

const formSchema = z.object({
  qty: z.number().int().min(1, "Mínimo 1 unidade.").max(50),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Selecione uma data."),
  scheduledHour: z.number().int().min(0).max(23),
  street: z.string().min(1, "Rua obrigatória."),
  number: z.string().min(1, "Número obrigatório."),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro obrigatório."),
  city: z.string().min(1, "Cidade obrigatória."),
  state: z.string().length(2, "UF inválida."),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido."),
  paymentMethod: z.enum(["pix", "card"]),
});

type FormValues = z.infer<typeof formSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildHourOptions(from: number, to: number): number[] {
  const hours: number[] = [];
  for (let h = from; h <= to; h++) hours.push(h);
  return hours;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function PreorderCheckoutForm({
  product,
  settings,
  minDate,
  maxDate,
  capacityMap,
}: PreorderCheckoutFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const hourOptions = buildHourOptions(settings.hourFrom, settings.hourTo);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      qty: 1,
      scheduledDate: minDate,
      scheduledHour: settings.hourFrom,
      city: "Belo Horizonte",
      state: "MG",
      paymentMethod: "pix" as const,
    },
  });

  const qty = watch("qty") || 1;
  const selectedDate = watch("scheduledDate");
  const subtotal = product.price_site * qty;
  const minValueBRL = formatBRL(settings.minValueCents / 100);
  const belowMin = Math.round(subtotal * 100) < settings.minValueCents;

  // Aviso de capacidade: mostra quantas encomendas já há na data selecionada
  const dateCapacityUsed = selectedDate ? (capacityMap[selectedDate] ?? 0) : 0;
  const dateNearCapacity =
    settings.dailyCapacity !== null && dateCapacityUsed >= settings.dailyCapacity * 0.8;

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await placePreorderAction({
        items: [{ productId: product.id, qty: values.qty }],
        scheduledDate: values.scheduledDate,
        scheduledHour: values.scheduledHour,
        paymentMethod: values.paymentMethod,
        shippingAddress: {
          street: values.street,
          number: values.number,
          complement: values.complement,
          neighborhood: values.neighborhood,
          city: values.city,
          state: values.state,
          cep: values.cep,
        },
        shippingFee: 0,
      });

      if (!result.ok) {
        setServerError(result.message);
        return;
      }

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }

      router.push(`/obrigado/${result.orderId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      {/* Header */}
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-terra-500" aria-hidden="true" />
        <h1 className="font-serif text-h2 font-bold text-olive-900">Finalizar encomenda</h1>
      </div>

      {/* Produto selecionado */}
      <Card padding="md" className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.photo.url}
          alt={product.photo.alt}
          className="h-16 w-16 rounded-sm object-cover"
        />
        <div className="flex flex-col gap-0.5">
          <p className="text-body font-semibold text-olive-900">{product.name}</p>
          <p className="text-body-sm text-olive-700">{formatBRL(product.price_site)} / unidade</p>
        </div>
      </Card>

      {/* Quantidade */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="qty" className="text-body-sm font-semibold text-olive-900">
          Quantidade
        </label>
        <input
          id="qty"
          type="number"
          min={1}
          max={50}
          {...register("qty", { valueAsNumber: true })}
          className={cn(
            "w-24 rounded-sm border px-3 py-2 text-body text-olive-900",
            "focus:ring-2 focus:ring-olive-900 focus:ring-offset-1 focus:outline-none",
            errors.qty ? "border-terra-500" : "border-divider bg-paper-50",
          )}
        />
        {errors.qty && <p className="text-caption text-terra-700">{errors.qty.message}</p>}

        {/* Valor mínimo */}
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-sm px-3 py-2 text-body-sm",
            belowMin
              ? "border border-terra-500/30 bg-terra-500/8 text-terra-700"
              : "border border-leaf-500/30 bg-leaf-500/8 text-leaf-700",
          )}
        >
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Subtotal: <strong>{formatBRL(subtotal)}</strong>
            {belowMin && ` — mínimo ${minValueBRL}`}
          </span>
        </div>
      </div>

      {/* Data e hora */}
      <fieldset className="flex flex-col gap-4 rounded-sm border border-divider bg-paper-50 p-4">
        <legend className="text-body-sm font-semibold text-olive-900">
          Data e hora de entrega
        </legend>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="scheduledDate" className="text-body-sm font-medium text-olive-900">
            Data
          </label>
          <input
            id="scheduledDate"
            type="date"
            min={minDate}
            max={maxDate}
            {...register("scheduledDate")}
            className={cn(
              "w-full rounded-sm border px-3 py-2 text-body text-olive-900",
              "focus:ring-2 focus:ring-olive-900 focus:ring-offset-1 focus:outline-none",
              errors.scheduledDate ? "border-terra-500" : "border-divider bg-paper-50",
            )}
          />
          {errors.scheduledDate && (
            <p className="text-caption text-terra-700">{errors.scheduledDate.message}</p>
          )}
          <p className="text-caption text-olive-700">
            Disponível de {minDate} até {maxDate}
            {settings.dailyCapacity !== null &&
              ` · capacidade de ${settings.dailyCapacity} por dia`}
          </p>
          {dateNearCapacity && (
            <p className="text-caption font-medium text-warning">
              Poucos horários disponíveis nesta data.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="scheduledHour" className="text-body-sm font-medium text-olive-900">
            Hora de entrega
          </label>
          <Controller
            control={control}
            name="scheduledHour"
            render={({ field }) => (
              <select
                id="scheduledHour"
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className={cn(
                  "w-full rounded-sm border px-3 py-2 text-body text-olive-900",
                  "focus:ring-2 focus:ring-olive-900 focus:ring-offset-1 focus:outline-none",
                  errors.scheduledHour ? "border-terra-500" : "border-divider bg-paper-50",
                )}
              >
                {hourOptions.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            )}
          />
          {errors.scheduledHour && (
            <p className="text-caption text-terra-700">{errors.scheduledHour.message}</p>
          )}
        </div>
      </fieldset>

      {/* Endereço de entrega */}
      <fieldset className="flex flex-col gap-4 rounded-sm border border-divider bg-paper-50 p-4">
        <legend className="text-body-sm font-semibold text-olive-900">Endereço de entrega</legend>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-body-sm font-medium text-olive-900">Rua</label>
            <Input
              {...register("street")}
              hasError={!!errors.street}
              placeholder="Rua das Flores"
            />
            {errors.street && (
              <p className="text-caption text-terra-700">{errors.street.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-body-sm font-medium text-olive-900">Nº</label>
            <Input {...register("number")} hasError={!!errors.number} placeholder="123" />
            {errors.number && (
              <p className="text-caption text-terra-700">{errors.number.message}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-body-sm font-medium text-olive-900">Complemento (opcional)</label>
          <Input {...register("complement")} placeholder="Apto, bloco…" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-body-sm font-medium text-olive-900">Bairro</label>
            <Input
              {...register("neighborhood")}
              hasError={!!errors.neighborhood}
              placeholder="Centro"
            />
            {errors.neighborhood && (
              <p className="text-caption text-terra-700">{errors.neighborhood.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-body-sm font-medium text-olive-900">CEP</label>
            <Input {...register("cep")} hasError={!!errors.cep} placeholder="30000-000" />
            {errors.cep && <p className="text-caption text-terra-700">{errors.cep.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-body-sm font-medium text-olive-900">Cidade</label>
            <Input {...register("city")} hasError={!!errors.city} placeholder="Belo Horizonte" />
            {errors.city && <p className="text-caption text-terra-700">{errors.city.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-body-sm font-medium text-olive-900">UF</label>
            <Input
              {...register("state")}
              hasError={!!errors.state}
              placeholder="MG"
              maxLength={2}
            />
            {errors.state && <p className="text-caption text-terra-700">{errors.state.message}</p>}
          </div>
        </div>
      </fieldset>

      {/* Método de pagamento */}
      <fieldset className="flex flex-col gap-3 rounded-sm border border-divider bg-paper-50 p-4">
        <legend className="text-body-sm font-semibold text-olive-900">Pagamento</legend>
        <Controller
          control={control}
          name="paymentMethod"
          render={({ field }) => (
            <div className="flex gap-3">
              {(["pix", "card"] as const).map((method) => (
                <label
                  key={method}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-sm border px-4 py-3 text-body-sm font-medium transition",
                    field.value === method
                      ? "border-olive-900 bg-olive-900 text-paper-50"
                      : "border-divider bg-paper-50 text-olive-900 hover:border-olive-500",
                  )}
                >
                  <input
                    type="radio"
                    value={method}
                    checked={field.value === method}
                    onChange={() => field.onChange(method)}
                    className="sr-only"
                  />
                  {method === "pix" ? "PIX" : "Cartão de crédito"}
                </label>
              ))}
            </div>
          )}
        />
        <p className="text-caption text-olive-700">
          Pagamento integral antecipado. Encomenda confirmada ao receber o pagamento.
        </p>
      </fieldset>

      {/* Erro do servidor */}
      {serverError && (
        <p
          role="alert"
          className="rounded-sm border border-terra-500/30 bg-terra-500/8 px-4 py-3 text-body-sm text-terra-700"
        >
          {serverError}
        </p>
      )}

      {/* Resumo + CTA */}
      <div className="flex flex-col gap-3 rounded-sm border border-divider bg-paper-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-body text-olive-700">Total da encomenda</span>
          <span className="text-body font-bold text-olive-900">{formatBRL(subtotal)}</span>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isPending || belowMin}
        >
          {isPending ? "Processando…" : "Confirmar encomenda"}
        </Button>

        {belowMin && (
          <p className="text-center text-caption text-terra-700">
            Adicione mais itens para atingir o mínimo de {minValueBRL}
          </p>
        )}
      </div>
    </form>
  );
}
