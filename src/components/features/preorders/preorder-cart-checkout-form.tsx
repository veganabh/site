"use client";

/**
 * Formulário de checkout de encomenda a partir do carrinho.
 *
 * Diferença do preorder-checkout-form (produto único via ?productId=):
 * este componente recebe `items[]` do cart-store — múltiplos produtos
 * com qtd já definida — e finaliza via placePreorderAction.
 *
 * Fluxo:
 *  1. Exibe resumo dos itens do carrinho
 *  2. Valida valor mínimo (subtotal >= settings.minValueCents)
 *  3. Seleciona data (date-picker com lead mín/máx + dias cheios bloqueados)
 *  4. Seleciona hora (inteiros na janela permitida)
 *  5. Endereço de entrega (reutiliza campos do checkout)
 *  6. Método de pagamento (PIX ou Cartão)
 *  7. Submete via placePreorderAction → clearCart em sucesso
 */

import { useState, useTransition, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarClock, ArrowLeft, Package, AlertTriangle, Check, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";

import type { PreorderSettings } from "@/types/store-settings";
import type { CartItem } from "@/stores/cart-store";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { placePreorderAction } from "@/server/actions/place-preorder";
import { useCartStore } from "@/stores/cart-store";
import { ProductPhoto } from "@/components/features/product-photo";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PreorderCartCheckoutFormProps = {
  settings: PreorderSettings;
  minDate: string;
  maxDate: string;
  /** Contagem de encomendas pagas por data — usado para mostrar aviso de capacidade. */
  capacityMap: Record<string, number>;
};

// ── Schema de validação ────────────────────────────────────────────────────────

const formSchema = z.object({
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

export function PreorderCartCheckoutForm({
  settings,
  minDate,
  maxDate,
  capacityMap,
}: PreorderCartCheckoutFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  // Lê os itens do carrinho diretamente — este componente é client-only
  const items = useCartStore((s) => s.items);
  const orderContext = useCartStore((s) => s.orderContext);
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const clearCart = useCartStore((s) => s.clearCart);

  const hourOptions = buildHourOptions(settings.hourFrom, settings.hourTo);

  const subtotal = useMemo(
    () => items.reduce((acc, i) => acc + i.product.price_site * i.quantity, 0),
    [items],
  );
  const minValueBRL = formatBRL(settings.minValueCents / 100);
  const belowMin = Math.round(subtotal * 100) < settings.minValueCents;

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scheduledDate: minDate,
      scheduledHour: settings.hourFrom,
      city: "Belo Horizonte",
      state: "MG",
      paymentMethod: "pix" as const,
    },
  });

  const selectedDate = watch("scheduledDate");

  // Aviso de capacidade: mostra quantas encomendas já há na data selecionada
  const dateCapacityUsed = selectedDate ? (capacityMap[selectedDate] ?? 0) : 0;
  const dateNearCapacity =
    settings.dailyCapacity !== null && dateCapacityUsed >= settings.dailyCapacity * 0.8;

  // Guard: se o carrinho não for preorder ou estiver vazio, volta
  if (orderContext !== "preorder" || items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <Package className="h-12 w-12 text-olive-500" aria-hidden="true" />
        <p className="text-body font-semibold text-olive-900">
          Sem itens de encomenda no carrinho.
        </p>
        <Button type="button" variant="primary" onClick={() => router.push("/encomendas")}>
          Ver encomendas
        </Button>
      </div>
    );
  }

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await placePreorderAction({
        items: items.map((i) => ({ productId: i.product.id, qty: i.quantity })),
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
        couponCode: appliedCoupon?.code,
      });

      if (!result.ok) {
        setServerError(result.message);
        return;
      }

      clearCart();

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
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Voltar"
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-olive-700 transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:bg-paper-100 hover:text-olive-900 focus-visible:outline-2 focus-visible:outline-olive-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-terra-500" aria-hidden="true" />
          <h1 className="font-serif text-h2 font-bold text-olive-900">Finalizar encomenda</h1>
        </div>
      </div>

      {/* Itens da encomenda */}
      <section aria-labelledby="items-heading">
        <h2
          id="items-heading"
          className="mb-3 text-micro font-semibold tracking-wide text-olive-700 uppercase"
        >
          {items.length} {items.length === 1 ? "item" : "itens"} na encomenda
        </h2>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <CartItemRow key={item.product.id} item={item} />
          ))}
        </ul>
      </section>

      {/* Valor mínimo */}
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-sm px-3 py-2 text-body-sm",
          belowMin
            ? "border border-terra-500/30 bg-terra-500/8 text-terra-700"
            : "border border-leaf-500/30 bg-leaf-500/8 text-leaf-700",
        )}
        role={belowMin ? "alert" : "status"}
        aria-live="polite"
      >
        {belowMin ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )}
        <span>
          Subtotal: <strong>{formatBRL(subtotal)}</strong>
          {belowMin && ` — mínimo da encomenda é ${minValueBRL}`}
        </span>
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
            <p className="text-caption text-terra-700" role="alert">
              {errors.scheduledDate.message}
            </p>
          )}
          <p className="text-caption text-olive-700">
            Disponível de {minDate} até {maxDate}
            {settings.dailyCapacity !== null &&
              ` · capacidade de ${settings.dailyCapacity} por dia`}
          </p>
          {dateNearCapacity && (
            <p className="text-caption font-medium text-warning" role="alert">
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
            <p className="text-caption text-terra-700" role="alert">
              {errors.scheduledHour.message}
            </p>
          )}
        </div>
      </fieldset>

      {/* Endereço de entrega */}
      <fieldset className="flex flex-col gap-4 rounded-sm border border-divider bg-paper-50 p-4">
        <legend className="text-body-sm font-semibold text-olive-900">Endereço de entrega</legend>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <label htmlFor="preorder-street" className="text-body-sm font-medium text-olive-900">
              Rua
            </label>
            <Input
              id="preorder-street"
              {...register("street")}
              hasError={!!errors.street}
              placeholder="Rua das Flores"
            />
            {errors.street && (
              <p className="text-caption text-terra-700" role="alert">
                {errors.street.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="preorder-number" className="text-body-sm font-medium text-olive-900">
              Nº
            </label>
            <Input
              id="preorder-number"
              {...register("number")}
              hasError={!!errors.number}
              placeholder="123"
            />
            {errors.number && (
              <p className="text-caption text-terra-700" role="alert">
                {errors.number.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="preorder-complement" className="text-body-sm font-medium text-olive-900">
            Complemento (opcional)
          </label>
          <Input id="preorder-complement" {...register("complement")} placeholder="Apto, bloco…" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="preorder-neighborhood"
              className="text-body-sm font-medium text-olive-900"
            >
              Bairro
            </label>
            <Input
              id="preorder-neighborhood"
              {...register("neighborhood")}
              hasError={!!errors.neighborhood}
              placeholder="Centro"
            />
            {errors.neighborhood && (
              <p className="text-caption text-terra-700" role="alert">
                {errors.neighborhood.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="preorder-cep" className="text-body-sm font-medium text-olive-900">
              CEP
            </label>
            <Input
              id="preorder-cep"
              {...register("cep")}
              hasError={!!errors.cep}
              placeholder="30000-000"
            />
            {errors.cep && (
              <p className="text-caption text-terra-700" role="alert">
                {errors.cep.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <label htmlFor="preorder-city" className="text-body-sm font-medium text-olive-900">
              Cidade
            </label>
            <Input
              id="preorder-city"
              {...register("city")}
              hasError={!!errors.city}
              placeholder="Belo Horizonte"
            />
            {errors.city && (
              <p className="text-caption text-terra-700" role="alert">
                {errors.city.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="preorder-state" className="text-body-sm font-medium text-olive-900">
              UF
            </label>
            <Input
              id="preorder-state"
              {...register("state")}
              hasError={!!errors.state}
              placeholder="MG"
              maxLength={2}
            />
            {errors.state && (
              <p className="text-caption text-terra-700" role="alert">
                {errors.state.message}
              </p>
            )}
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

      {/* Resumo de valores + CTA */}
      <Card padding="none" className="flex flex-col gap-3 p-4">
        <dl className="flex flex-col gap-1.5 text-body-sm">
          <div className="flex justify-between">
            <dt className="text-olive-700">Subtotal</dt>
            <dd className="font-semibold text-olive-900 tabular-nums">{formatBRL(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-olive-700">Entrega</dt>
            <dd className="font-semibold text-success tabular-nums">Grátis</dd>
          </div>
          <div className="mt-1 flex items-baseline justify-between border-t border-divider pt-2">
            <dt className="font-semibold text-olive-900">Total</dt>
            <dd className="text-h3 font-bold text-olive-900 tabular-nums">{formatBRL(subtotal)}</dd>
          </div>
        </dl>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isPending || belowMin}
        >
          {isPending ? (
            "Processando…"
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
              Confirmar encomenda
            </>
          )}
        </Button>

        {belowMin && (
          <p className="text-center text-caption text-terra-700" role="alert">
            Adicione mais itens para atingir o mínimo de {minValueBRL}
          </p>
        )}
      </Card>
    </form>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function CartItemRow({ item }: { item: CartItem }) {
  return (
    <li className="flex items-start gap-3 rounded-sm border border-divider bg-paper-50 p-3">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-paper-100">
        <ProductPhoto product={item.product} sizes="56px" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-snug">
        <p className="text-body-sm font-semibold text-olive-900">{item.product.name}</p>
        <p className="text-caption text-olive-700">
          {formatBRL(item.product.price_site)} × {item.quantity}
        </p>
      </div>
      <span className="shrink-0 text-body-sm font-bold text-olive-900 tabular-nums">
        {formatBRL(item.product.price_site * item.quantity)}
      </span>
    </li>
  );
}
