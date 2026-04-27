"use server";

import { requireAdmin } from "@/server/auth/require-admin";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const BUCKET = "product-photos";

type AllowedMime = (typeof ALLOWED_MIME)[number];

export type UploadPhotoResult =
  | { ok: true; url: string; path: string }
  | { ok: false; message: string };

function extFromMime(mime: AllowedMime): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "webp";
}

export async function uploadProductPhotoAction(formData: FormData): Promise<UploadPhotoResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Selecione uma imagem." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "Imagem maior que 2 MB. Reduza antes de enviar." };
  }
  if (!ALLOWED_MIME.includes(file.type as AllowedMime)) {
    return { ok: false, message: "Formato inválido. Use JPG, PNG ou WebP." };
  }

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const ext = extFromMime(file.type as AllowedMime);
  const path = `products/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    console.error("[upload-product-photo]", error.message);
    return { ok: false, message: "Falha no upload. Tente novamente." };
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: pub.publicUrl, path };
}
