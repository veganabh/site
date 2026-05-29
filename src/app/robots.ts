import type { MetadataRoute } from "next";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.veganabh.com.br").replace(
  /\/$/,
  "",
);

/**
 * robots.txt — libera a vitrine, bloqueia área interna (gestão) e conta.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/gestao", "/conta", "/api"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
