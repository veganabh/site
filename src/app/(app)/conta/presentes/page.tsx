import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { GiftsList } from "@/components/conta/gifts-list";

export const metadata: Metadata = {
  title: "Presentes enviados — Veg.ana",
  description:
    "Histórico dos presentes que você mandou: pra quem foi, o que tinha e a mensagem do cartão.",
};

export default function PresentesPage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <Link
          href="/conta"
          className="inline-flex w-fit items-center gap-1 text-[12px] font-semibold text-olive-700 transition-colors hover:text-olive-900"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Voltar pra conta
        </Link>
        <div>
          <h1 className="text-[20px] leading-snug font-bold text-olive-900 md:text-[24px]">
            Presentes enviados
          </h1>
          <p className="mt-1 text-body-sm text-olive-700">
            Tudo que você mandou de doce pra alguém — com data, cartão e destino.
          </p>
        </div>
      </header>

      <GiftsList />
    </div>
  );
}
