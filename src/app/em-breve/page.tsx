import type { Metadata } from "next";
import Image from "next/image";
import { Star, Truck, Heart, Sparkles, MessageCircle } from "lucide-react";

import { STORE_LOCATION } from "@/lib/store-location";

export const metadata: Metadata = {
  title: "Em breve — Veg.ana",
  description:
    "A doceria vegana da Veg.ana está chegando ao site. Sem lactose, feito à mão em Belo Horizonte. Enquanto isso, peça pelo WhatsApp ou iFood.",
};

/**
 * Tela de pré-lançamento ("em breve").
 *
 * Standalone — não usa o shell público (sem sidebar/footer). Carrega a ID
 * visual da marca: foto de produto fullscreen + overlay olive, logo, tagline
 * do Brand Voice ("Doce feito em casa"), prova social (4.9 iFood) e CTA pro
 * WhatsApp/Instagram. Servida pelo middleware quando NEXT_PUBLIC_COMING_SOON=on.
 *
 * O "forno" animado (o ⏳ girando + vapor) é o toque divertido: a ideia é
 * "tá assando, já sai".
 */
export default function ComingSoonPage() {
  const wa = `https://wa.me/${STORE_LOCATION.whatsappNumber}`;
  const ig = "https://instagram.com/vegana.bh";

  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-olive-900 px-6 py-12 text-paper-50">
      {/* Foto fullscreen + overlay */}
      <Image
        src="/produtos/bolo-cenoura-brigadeiro.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-olive-900/85 via-olive-900/80 to-olive-900/95"
      />
      {/* Brilhos terra — mesma assinatura do hero da home */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-terra-500/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-terra-500/15 blur-3xl"
      />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-7 text-center">
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Veg.ana" className="h-9 w-auto brightness-0 invert" />

        {/* Selo "no forno" — animado, o toque divertido */}
        <span className="inline-flex items-center gap-2 rounded-full bg-paper-50/10 px-3.5 py-1.5 text-caption font-semibold ring-1 ring-paper-50/20 backdrop-blur-sm ring-inset">
          <span className="inline-block animate-spin [animation-duration:2.4s]" aria-hidden="true">
            ⏳
          </span>
          Tá assando…
        </span>

        {/* Título */}
        <div className="flex flex-col gap-3">
          <h1 className="text-h1 leading-tight font-extrabold text-balance md:text-display">
            A gente tá colocando a cereja no bolo.
          </h1>
          <p className="text-body-lg text-balance text-paper-50/85">
            Nosso site novo sai do forno em pouquinhos dias. Doce feito em casa, sem lactose, feito
            à mão em Belo Horizonte.
          </p>
        </div>

        {/* Prova social */}
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-paper-50/10 px-3 py-1 text-caption font-medium ring-1 ring-paper-50/15 ring-inset"
          aria-label="Avaliação 4.9 no iFood com mais de 420 pedidos"
        >
          <Star
            className="h-3.5 w-3.5 fill-terra-500 text-terra-500"
            strokeWidth={0}
            aria-hidden="true"
          />
          <span className="font-semibold">4.9</span>
          <span aria-hidden="true">·</span>
          <span>420 pedidos no iFood</span>
        </span>

        {/* Perks — mesma assinatura do hero */}
        <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-caption text-paper-50/90">
          <li className="inline-flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-terra-500" aria-hidden="true" />
            entrega no mesmo dia
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-terra-500" aria-hidden="true" />
            sem lactose, 100% vegano
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-terra-500" aria-hidden="true" />
            feito à mão, todo dia
          </li>
        </ul>

        {/* CTA — enquanto o site não abre, vende pelo canal que já existe */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-body-sm text-paper-50/80">Bateu a vontade? A gente já tá atendendo:</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-terra-500 px-5 text-body-sm font-semibold text-paper-50 transition-colors hover:bg-terra-700"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Pedir no WhatsApp
            </a>
            <a
              href={ig}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-paper-50/10 px-5 text-body-sm font-semibold text-paper-50 ring-1 ring-paper-50/25 backdrop-blur-sm transition-colors ring-inset hover:bg-paper-50/20"
            >
              <InstagramGlyph className="h-4 w-4" />
              {STORE_LOCATION.instagramHandle}
            </a>
          </div>
        </div>
      </div>

      <p className="relative z-10 mt-10 text-micro text-paper-50/60">
        © {new Date().getFullYear()} Veg.ana · Belo Horizonte
      </p>
    </main>
  );
}

/** Lucide 1.x removeu brand icons — Instagram vai como SVG inline (igual ao footer). */
function InstagramGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}
