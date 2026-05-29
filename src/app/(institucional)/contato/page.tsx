import type { Metadata } from "next";
import { MessageCircle, MapPin, Clock } from "lucide-react";
import { STORE_LOCATION } from "@/lib/store-location";
import { Card } from "@/components/ui/card";

/** Lucide 1.x removeu brand icons — Instagram vai como SVG inline. */
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

export const metadata: Metadata = {
  title: "Contato — Veg.ana",
  description: "Fala com a Veg.ana: WhatsApp, Instagram e área de entrega em Belo Horizonte.",
};

export default function ContatoPage() {
  const waLink = `https://wa.me/${STORE_LOCATION.whatsappNumber}?text=Oi!%20Vim%20pelo%20site%20da%20Veg.ana.`;
  const igLink = `https://instagram.com/${STORE_LOCATION.instagramHandle.replace(/^@/, "")}`;
  const waPretty = STORE_LOCATION.whatsappNumber.replace(/^55(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 border-b border-divider pb-5">
        <h1 className="text-h2 leading-tight font-bold text-olive-900 md:text-h2">
          Fala com a gente
        </h1>
        <p className="text-body-sm text-olive-700">
          O jeito mais rápido é o WhatsApp — é por lá que a gente combina pedido, tira dúvida de
          ingrediente e resolve qualquer coisa.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col gap-1.5 rounded-2xl border border-divider bg-paper-50 p-4 transition hover:border-leaf-500/50 hover:bg-leaf-500/5"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-leaf-500/10 text-leaf-700">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="mt-1 text-body font-bold text-olive-900">WhatsApp</span>
          <span className="text-body-sm text-olive-700">{waPretty}</span>
        </a>

        <a
          href={igLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col gap-1.5 rounded-2xl border border-divider bg-paper-50 p-4 transition hover:border-terra-500/50 hover:bg-terra-500/5"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-terra-500/10 text-terra-700">
            <InstagramGlyph className="h-5 w-5" />
          </span>
          <span className="mt-1 text-body font-bold text-olive-900">Instagram</span>
          <span className="text-body-sm text-olive-700">{STORE_LOCATION.instagramHandle}</span>
        </a>
      </div>

      <Card as="section" padding="none" className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-olive-700" aria-hidden="true" />
          <div>
            <p className="text-body-sm font-bold text-olive-900">Onde a gente entrega</p>
            <p className="text-body-sm text-olive-700">
              Delivery em {STORE_LOCATION.city} e região. Confira no carrinho se o seu CEP é
              atendido — a área cresce aos poucos.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 border-t border-divider pt-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-olive-700" aria-hidden="true" />
          <div>
            <p className="text-body-sm font-bold text-olive-900">Atendimento</p>
            <p className="text-body-sm text-olive-700">
              Pedidos pelo site a qualquer hora. Atendimento no WhatsApp durante o dia — pode mandar
              mensagem que a gente responde assim que possível.
            </p>
          </div>
        </div>
      </Card>
    </article>
  );
}
