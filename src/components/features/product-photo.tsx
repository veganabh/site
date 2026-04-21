import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Product, ProductCategory } from "@/types/product";

type ProductPhotoProps = {
  product: Pick<Product, "name" | "category" | "photo" | "slug" | "photoSecondary">;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /**
   * Quando true e o produto tem `photoSecondary`, renderiza ambas empilhadas
   * e cross-fade no hover do ancestral com classe `group`.
   */
  withHoverSecondary?: boolean;
};

/**
 * Foto do produto. Se `photo.url` estiver presente, renderiza <Image>.
 * Caso contrário, desenha um placeholder SVG com gradiente da paleta,
 * garrafa/pote/fatia estilizada por categoria e rótulo "Veg.ana".
 */
export function ProductPhoto({
  product,
  className,
  sizes,
  priority,
  withHoverSecondary,
}: ProductPhotoProps) {
  const hasPhoto = product.photo.url.trim().length > 0;
  const showSecondary = withHoverSecondary && !!product.photoSecondary?.url;

  if (hasPhoto) {
    return (
      <>
        <Image
          src={product.photo.url}
          alt={product.photo.alt}
          fill
          sizes={sizes ?? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
          className={cn(
            "object-cover transition-opacity duration-500",
            showSecondary && "group-hover:opacity-0",
            className,
          )}
          priority={priority}
        />
        {showSecondary && (
          <Image
            src={product.photoSecondary!.url}
            alt={product.photoSecondary!.alt}
            fill
            sizes={sizes ?? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
            className={cn(
              "object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100",
              className,
            )}
          />
        )}
      </>
    );
  }

  const palette = paletteFor(product.category, product.slug);
  return (
    <svg
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={product.photo.alt || product.name}
      className={cn("h-full w-full", className)}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`bg-${product.slug}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={palette.bgFrom} />
          <stop offset="1" stopColor={palette.bgTo} />
        </linearGradient>
        <radialGradient id={`glow-${product.slug}`} cx="0.3" cy="0.25" r="0.8">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill={`url(#bg-${product.slug})`} />
      <rect width="400" height="400" fill={`url(#glow-${product.slug})`} />
      <CategoryGlyph category={product.category} accent={palette.accent} ink={palette.ink} />
      <text
        x="200"
        y="348"
        textAnchor="middle"
        fontFamily="Caveat, cursive"
        fontSize="30"
        fill={palette.ink}
        opacity="0.85"
      >
        Veg.ana
      </text>
    </svg>
  );
}

type Palette = {
  bgFrom: string;
  bgTo: string;
  accent: string;
  ink: string;
};

const PALETTES: Record<ProductCategory, Palette[]> = {
  "bolo-no-pote": [
    { bgFrom: "#e5e2d9", bgTo: "#b8c0a8", accent: "#de6e27", ink: "#2b3210" },
    { bgFrom: "#f1d9c6", bgTo: "#de6e27", accent: "#2b3210", ink: "#2b3210" },
    { bgFrom: "#d4d9c4", bgTo: "#505631", accent: "#fbf8ef", ink: "#fbf8ef" },
    { bgFrom: "#fbf8ef", bgTo: "#d89527", accent: "#b4551d", ink: "#2b3210" },
  ],
  bolo: [
    { bgFrom: "#e5d5c3", bgTo: "#b4551d", accent: "#fbf8ef", ink: "#fbf8ef" },
    { bgFrom: "#fbf8ef", bgTo: "#b8c0a8", accent: "#505631", ink: "#2b3210" },
    { bgFrom: "#c9a98a", bgTo: "#3c4221", accent: "#de6e27", ink: "#fbf8ef" },
  ],
  docinho: [
    { bgFrom: "#fbf8ef", bgTo: "#de6e27", accent: "#2b3210", ink: "#2b3210" },
    { bgFrom: "#e5e2d9", bgTo: "#505631", accent: "#de6e27", ink: "#fbf8ef" },
    { bgFrom: "#d89527", bgTo: "#b4551d", accent: "#fbf8ef", ink: "#fbf8ef" },
  ],
  "edicao-especial": [{ bgFrom: "#3c4221", bgTo: "#2b3210", accent: "#de6e27", ink: "#fbf8ef" }],
};

function paletteFor(category: ProductCategory, slug: string): Palette {
  const pool = PALETTES[category];
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) hash = (hash + slug.charCodeAt(i)) % pool.length;
  return pool[hash];
}

function CategoryGlyph({
  category,
  accent,
  ink,
}: {
  category: ProductCategory;
  accent: string;
  ink: string;
}) {
  if (category === "bolo-no-pote") {
    return (
      <g>
        <path d="M 150 130 L 250 130 L 240 290 Q 200 310 160 290 Z" fill={accent} opacity="0.95" />
        <rect x="150" y="120" width="100" height="18" rx="4" fill={ink} opacity="0.75" />
        <rect x="160" y="160" width="80" height="16" fill={ink} opacity="0.18" />
        <rect x="160" y="200" width="80" height="16" fill={ink} opacity="0.18" />
        <rect x="160" y="240" width="80" height="16" fill={ink} opacity="0.18" />
      </g>
    );
  }
  if (category === "bolo") {
    return (
      <g>
        <path d="M 110 180 L 290 180 L 270 290 Q 200 310 130 290 Z" fill={accent} opacity="0.95" />
        <path d="M 110 180 L 290 180 L 290 200 L 110 200 Z" fill={ink} opacity="0.25" />
        <circle cx="155" cy="165" r="7" fill={ink} opacity="0.7" />
        <circle cx="200" cy="160" r="7" fill={ink} opacity="0.7" />
        <circle cx="245" cy="165" r="7" fill={ink} opacity="0.7" />
      </g>
    );
  }
  if (category === "docinho") {
    return (
      <g>
        <circle cx="200" cy="215" r="78" fill={accent} opacity="0.95" />
        <circle cx="172" cy="190" r="6" fill={ink} opacity="0.55" />
        <circle cx="215" cy="180" r="5" fill={ink} opacity="0.55" />
        <circle cx="230" cy="220" r="6" fill={ink} opacity="0.55" />
        <circle cx="190" cy="240" r="5" fill={ink} opacity="0.55" />
        <circle cx="210" cy="250" r="5" fill={ink} opacity="0.55" />
      </g>
    );
  }
  return (
    <g>
      <circle cx="200" cy="200" r="80" fill={accent} opacity="0.9" />
    </g>
  );
}
