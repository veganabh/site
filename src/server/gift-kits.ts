import "server-only";

import type { GiftKitTemplate } from "@/types/gift-kit";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { giftKitTemplateFromRow } from "@/server/supabase/mappers";

/**
 * Gift kits do Supabase. RLS já filtra `active=true AND deleted_at IS NULL`
 * pra não-admin — admin vê tudo. Slots têm SELECT público (visibilidade
 * sempre acompanha o template).
 *
 * Estratégia: 1 query templates + 1 query slots (IN template_ids), join em
 * memória. Volume baixo (3–10 kits típico), evita JOIN custoso.
 */
export async function listGiftKitTemplates(opts?: {
  onlyActive?: boolean;
}): Promise<GiftKitTemplate[]> {
  const supabase = await createSupabaseServerClient();
  let templatesQuery = supabase.from("gift_kit_templates").select("*").is("deleted_at", null);
  if (opts?.onlyActive ?? true) {
    templatesQuery = templatesQuery.eq("active", true);
  }

  const { data: templates, error: templatesError } = await templatesQuery.order("created_at", {
    ascending: true,
  });

  if (templatesError) {
    console.error("[server/gift-kits] listGiftKitTemplates templates:", templatesError.message);
    return [];
  }

  const templateIds = (templates ?? []).map((t) => t.id);
  if (templateIds.length === 0) return [];

  const { data: slots, error: slotsError } = await supabase
    .from("gift_kit_slots")
    .select("*")
    .in("template_id", templateIds);

  if (slotsError) {
    console.error("[server/gift-kits] listGiftKitTemplates slots:", slotsError.message);
    return [];
  }

  return (templates ?? []).map((t) => giftKitTemplateFromRow(t, slots ?? []));
}

export async function getGiftKitBySlug(slug: string): Promise<GiftKitTemplate | null> {
  const supabase = await createSupabaseServerClient();
  const { data: template, error } = await supabase
    .from("gift_kit_templates")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[server/gift-kits] getGiftKitBySlug template:", error.message);
    return null;
  }
  if (!template) return null;

  const { data: slots, error: slotsError } = await supabase
    .from("gift_kit_slots")
    .select("*")
    .eq("template_id", template.id);

  if (slotsError) {
    console.error("[server/gift-kits] getGiftKitBySlug slots:", slotsError.message);
    return null;
  }

  return giftKitTemplateFromRow(template, slots ?? []);
}

export async function getGiftKitById(id: string): Promise<GiftKitTemplate | null> {
  const supabase = await createSupabaseServerClient();
  const { data: template, error } = await supabase
    .from("gift_kit_templates")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[server/gift-kits] getGiftKitById template:", error.message);
    return null;
  }
  if (!template) return null;

  const { data: slots, error: slotsError } = await supabase
    .from("gift_kit_slots")
    .select("*")
    .eq("template_id", template.id);

  if (slotsError) {
    console.error("[server/gift-kits] getGiftKitById slots:", slotsError.message);
    return null;
  }

  return giftKitTemplateFromRow(template, slots ?? []);
}
