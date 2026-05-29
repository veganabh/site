// Converte e otimiza imagens para WebP (produto Veg.ana).
//
// Uso:
//   node scripts/optimize-images.mjs <pasta-entrada> [pasta-saida] [largura]
//
// Exemplos:
//   node scripts/optimize-images.mjs "C:/Users/pedro/Downloads/fotos"
//   node scripts/optimize-images.mjs ./in ./out 1600
//
// Padrão: saída = <entrada>/webp · largura máx = 1600px · qualidade = 80.
// Aceita .png .jpg .jpeg .webp. Mantém o nome, troca extensão para .webp.

import { readdir, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const INPUT = process.argv[2];
const OUTPUT = process.argv[3] ?? (INPUT ? path.join(INPUT, "webp") : null);
const MAX_WIDTH = Number(process.argv[4] ?? 1600);
const QUALITY = 80;
const EXTS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

if (!INPUT) {
  console.error("Falta a pasta de entrada.\nUso: node scripts/optimize-images.mjs <pasta-entrada> [pasta-saida] [largura]");
  process.exit(1);
}

function kb(bytes) {
  return (bytes / 1024).toFixed(0) + " KB";
}

async function run() {
  await mkdir(OUTPUT, { recursive: true });
  const files = (await readdir(INPUT)).filter((f) => EXTS.has(path.extname(f).toLowerCase()));

  if (files.length === 0) {
    console.log("Nenhuma imagem (.png/.jpg/.webp) encontrada em", INPUT);
    return;
  }

  let totalIn = 0;
  let totalOut = 0;

  for (const file of files) {
    const src = path.join(INPUT, file);
    const dst = path.join(OUTPUT, path.basename(file, path.extname(file)) + ".webp");

    const inSize = (await stat(src)).size;
    await sharp(src)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 5 })
      .toFile(dst);
    const outSize = (await stat(dst)).size;

    totalIn += inSize;
    totalOut += outSize;
    const pct = ((1 - outSize / inSize) * 100).toFixed(0);
    console.log(`${file}  ${kb(inSize)} -> ${kb(outSize)}  (-${pct}%)`);
  }

  console.log("─".repeat(50));
  console.log(`${files.length} imagens · ${kb(totalIn)} -> ${kb(totalOut)} · economia ${((1 - totalOut / totalIn) * 100).toFixed(0)}%`);
  console.log("Saída:", OUTPUT);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
