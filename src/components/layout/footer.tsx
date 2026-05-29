import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { STORE_LOCATION } from "@/lib/store-location";

/**
 * Lucide 1.x removeu brand icons — Instagram vai como SVG inline.
 */
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

const INSTITUTIONAL_LINKS = [
  { href: "/contato", label: "Contato" },
  { href: "/termos", label: "Termos" },
  { href: "/privacidade", label: "Privacidade" },
] as const;

/**
 * Rodapé institucional — links, social, copyright.
 * Aparece em todas as páginas via RootLayout.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-divider bg-paper-100">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-10 text-center md:flex-row md:justify-between md:py-12 md:text-left">
        <nav aria-label="Institucional" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {INSTITUTIONAL_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-body-sm text-olive-700 transition-colors hover:text-olive-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <a
            href="https://instagram.com/vegana.bh"
            aria-label="Instagram da Veg.ana"
            target="_blank"
            rel="noopener noreferrer"
            className="text-olive-700 transition-colors hover:text-olive-900"
          >
            <InstagramGlyph className="h-5 w-5" />
          </a>
          <a
            href={`https://wa.me/${STORE_LOCATION.whatsappNumber}`}
            aria-label="Falar com a Veg.ana no WhatsApp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-olive-700 transition-colors hover:text-olive-900"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="border-t border-divider">
        <p className="mx-auto max-w-7xl px-4 py-4 text-center text-caption text-olive-700">
          © {year} Veg.ana · Belo Horizonte
        </p>
      </div>
    </footer>
  );
}
