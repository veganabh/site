import type { MetadataRoute } from "next";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.veganabh.com.br").replace(
  /\/$/,
  "",
);

/**
 * Sitemap das rotas públicas. Produtos não têm página própria (a vitrine
 * filtra via querystring), então só as rotas institucionais + vitrine.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = ["", "/presentear", "/contato", "/termos", "/privacidade"];
  return routes.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
