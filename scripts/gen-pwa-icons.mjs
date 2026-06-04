// Gera ícones PWA a partir de src/app/icon.svg (V cream sobre verde leaf).
// Uso: node scripts/gen-pwa-icons.mjs
// Saída: public/icons/icon-192.png, icon-512.png, maskable-512.png + src/app/apple-icon.png
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "src/app/icon.svg"));
const LEAF = "#6b9f41"; // bg da marca (= fundo do icon.svg)

const iconsDir = join(root, "public/icons");
mkdirSync(iconsDir, { recursive: true });

// "any" — ícone redondo da marca como está (Android mostra sem máscara)
for (const size of [192, 512]) {
  await sharp(svg, { density: 512 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(iconsDir, `icon-${size}.png`));
}

// maskable 512 — glifo a 78% sobre quadrado verde full-bleed (safe zone)
const inner = Math.round(512 * 0.78);
const glyph = await sharp(svg, { density: 512 })
  .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: LEAF } })
  .composite([{ input: glyph, gravity: "center" }])
  .png()
  .toFile(join(iconsDir, "maskable-512.png"));

// apple-icon 180 — quadrado verde full-bleed (iOS arredonda sozinho)
const appleGlyph = await sharp(svg, { density: 512 })
  .resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
await sharp({ create: { width: 180, height: 180, channels: 4, background: LEAF } })
  .composite([{ input: appleGlyph, gravity: "center" }])
  .png()
  .toFile(join(root, "src/app/apple-icon.png"));

console.log("PWA icons gerados: icon-192, icon-512, maskable-512, apple-icon");
