import "server-only";

import { createSupabaseServerClient } from "@/server/supabase/server";
import {
  SEED_SETTINGS,
  type AdminSettings,
  type StoreStatus,
  type WeekHours,
} from "@/types/store-settings";

/**
 * Lê a config singleton da loja (store_settings, id='default'). SELECT é
 * público (RLS) → funciona pra cliente e admin. Em falha, devolve o seed
 * (loja aberta) pra não derrubar a UI.
 */
export async function getStoreSettings(): Promise<AdminSettings> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("store_settings")
    .select("store_status, hours, printer_enabled, printer_name, auto_accept")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[store-settings/get]", error.message);
    return SEED_SETTINGS;
  }

  return {
    storeStatus: (data.store_status as StoreStatus) ?? "ATIVO",
    hours: (data.hours as WeekHours) ?? SEED_SETTINGS.hours,
    printerEnabled: data.printer_enabled ?? false,
    printerName: data.printer_name ?? "",
    autoAccept: data.auto_accept ?? false,
  };
}
