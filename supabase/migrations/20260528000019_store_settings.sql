-- Migration 19 — Configurações da loja (DB-backed)
--
-- Antes: status/horário viviam só no localStorage do admin (admin-settings-store).
-- Bug: cliente em outro device nunca via "loja fechada". Agora persiste no
-- Supabase com SELECT público → cliente lê o status real; write só admin.
--
-- Singleton: id fixo = 'default' (CHECK força linha única).

CREATE TABLE IF NOT EXISTS public.store_settings (
  id text PRIMARY KEY DEFAULT 'default' CONSTRAINT ck_store_settings_singleton CHECK (id = 'default'),
  store_status text NOT NULL DEFAULT 'ATIVO'
    CONSTRAINT ck_store_settings_status CHECK (store_status IN ('ATIVO', 'PAUSADO')),
  hours jsonb NOT NULL DEFAULT '{
    "mon": {"open": false, "from": "09:00", "to": "19:00"},
    "tue": {"open": true,  "from": "09:00", "to": "19:00"},
    "wed": {"open": true,  "from": "09:00", "to": "19:00"},
    "thu": {"open": true,  "from": "09:00", "to": "19:00"},
    "fri": {"open": true,  "from": "09:00", "to": "19:00"},
    "sat": {"open": true,  "from": "10:00", "to": "18:00"},
    "sun": {"open": true,  "from": "11:00", "to": "17:00"}
  }'::jsonb,
  printer_enabled boolean NOT NULL DEFAULT false,
  printer_name text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.store_settings IS 'Config operacional da loja (singleton). Status + horários + impressora.';

-- Trigger updated_at
DROP TRIGGER IF EXISTS tg_store_settings_touch_updated_at ON public.store_settings;
CREATE TRIGGER tg_store_settings_touch_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- Seed da linha única
INSERT INTO public.store_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- SELECT público — cliente precisa ver se a loja está aberta
DROP POLICY IF EXISTS "store_settings_select_public" ON public.store_settings;
CREATE POLICY "store_settings_select_public" ON public.store_settings
  FOR SELECT
  USING (true);

-- UPDATE só admin
DROP POLICY IF EXISTS "store_settings_update_admin" ON public.store_settings;
CREATE POLICY "store_settings_update_admin" ON public.store_settings
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
