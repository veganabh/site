import type { MetadataRoute } from "next";

/**
 * Web App Manifest (PWA). Next 16 serve em /manifest.webmanifest e injeta o
 * <link rel="manifest"> automaticamente. Torna o site instalável na home do
 * celular (display standalone), com ícone, cor de tema e tela de splash.
 *
 * Cores: theme_color = olive-900 (barra de status), background_color = paper-50
 * (fundo do splash). Ícones gerados de src/app/icon.svg via scripts/gen-pwa-icons.mjs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Veg.ana — doces sem lactose em BH",
    short_name: "Veg.ana",
    description:
      "Doceria vegana feita à mão em Belo Horizonte. Bolos, bombons e bolo no pote sem lactose.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    dir: "ltr",
    background_color: "#fbf8ef",
    theme_color: "#2b3210",
    categories: ["food", "shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
