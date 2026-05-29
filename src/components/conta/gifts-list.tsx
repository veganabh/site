"use client";

import Link from "next/link";
import { Gift, Package, MessageCircle, MapPin, Truck, Check } from "lucide-react";
import { useOrdersStore } from "@/stores/orders-store";
import type { PlacedGift } from "@/stores/orders-store";
import { KitCoverPhoto } from "@/components/gift/kit-cover-photo";
import { formatBRL } from "@/lib/format";

const DAY_NAMES = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(5, 10).replace("-", "/");
  const dayName = DAY_NAMES[d.getDay()];
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${dayName}, ${day}/${month}`;
}

export function GiftsList() {
  const gifts = useOrdersStore((s) => s.gifts);

  if (gifts.length === 0) {
    return <EmptyState />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {gifts.map((g) => (
        <GiftCard key={g.giftId} gift={g} />
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <section
      aria-label="Sem presentes"
      className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-divider bg-paper-50 px-6 py-10 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-terra-500/10 text-terra-700">
        <Gift className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-body font-bold text-olive-900">Nenhum presente enviado ainda.</p>
        <p className="text-body-sm text-olive-700">
          Quando mandar um kit pra alguém, ele aparece aqui com cartão, data e endereço de entrega.
        </p>
      </div>
      <Link
        href="/presentear"
        className="inline-flex h-10 items-center gap-2 rounded-full bg-terra-500 px-5 text-body-sm font-semibold text-paper-50 transition-transform active:scale-[0.98]"
      >
        <Gift className="h-4 w-4" aria-hidden="true" />
        Montar um kit
      </Link>
    </section>
  );
}

function GiftCard({ gift }: { gift: PlacedGift }) {
  const isDelivered = gift.status === "entregue";

  return (
    <li className="flex flex-col gap-3 rounded-sm border border-divider bg-paper-50 p-4">
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-paper-100">
          <KitCoverPhoto photo={gift.coverPhoto} sizes="64px" />
          <span
            aria-hidden="true"
            className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-terra-500 text-paper-50 shadow-sm"
          >
            <Gift className="h-3 w-3" />
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-snug">
          <p className="text-body-sm font-bold text-olive-900">{gift.templateName}</p>
          <p className="text-micro text-olive-700">
            enviado em {formatShortDate(gift.placedAt)} · pedido {gift.orderId}
          </p>
        </div>

        <span
          className={
            isDelivered
              ? "inline-flex items-center gap-1 rounded-full bg-leaf-500/10 px-2 py-0.5 text-micro font-semibold text-leaf-700"
              : "inline-flex items-center gap-1 rounded-full bg-terra-500/10 px-2 py-0.5 text-micro font-semibold text-terra-700"
          }
        >
          {isDelivered ? (
            <>
              <Check className="h-3 w-3" aria-hidden="true" />
              entregue
            </>
          ) : (
            <>
              <Truck className="h-3 w-3" aria-hidden="true" />a caminho
            </>
          )}
        </span>
      </div>

      <ul className="flex flex-col gap-1 rounded-sm bg-paper-100 p-3">
        {gift.picks.map((row, idx) => (
          <li key={idx} className="text-micro text-olive-900">
            <span className="font-semibold text-olive-700">{row.slotLabel}:</span>{" "}
            {row.productNames.join(", ")}
          </li>
        ))}
        {gift.packaging && (
          <li className="mt-1 inline-flex items-center gap-1 text-micro font-semibold text-terra-700">
            <Package className="h-3 w-3" aria-hidden="true" />
            Embalagem de presente
          </li>
        )}
      </ul>

      {gift.cardMessage && (
        <div className="flex items-start gap-2 rounded-sm border border-divider bg-paper-100 p-3">
          <MessageCircle
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terra-500"
            aria-hidden="true"
          />
          <p className="text-micro leading-relaxed text-olive-900 italic">
            &ldquo;{gift.cardMessage}&rdquo;
          </p>
        </div>
      )}

      {gift.recipient && (
        <div className="flex items-start gap-2 rounded-sm border border-divider p-3">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terra-500" aria-hidden="true" />
          <div className="flex min-w-0 flex-col gap-0.5 text-micro leading-snug">
            <span className="font-semibold text-olive-900">pra {gift.recipient.name}</span>
            <span className="text-olive-700">
              {gift.recipient.street}, {gift.recipient.number}
              {gift.recipient.complement ? ` — ${gift.recipient.complement}` : ""}
            </span>
            <span className="text-olive-700">
              {gift.recipient.neighborhood} · {gift.recipient.city}/{gift.recipient.state}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-divider pt-3">
        <span className="text-micro font-semibold text-olive-700">Total</span>
        <span className="text-body-sm font-bold text-olive-900 tabular-nums">
          {formatBRL(gift.total)}
        </span>
      </div>
    </li>
  );
}
