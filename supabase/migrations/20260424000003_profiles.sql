-- Migration 03 — Profiles (ADR 0008 D1, D2, D3, D18)
-- Espelho 1:1 de auth.users com perfil estendido + role admin/customer.

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  phone text,
  cpf text,
  avatar_url text,
  role text NOT NULL DEFAULT 'customer'
    CONSTRAINT ck_profiles_role_valid CHECK (role IN ('customer', 'admin')),
  is_anonymized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Perfil estendido de auth.users (1:1).';
COMMENT ON COLUMN public.profiles.role IS 'customer (default) | admin. Verificado via is_admin().';
COMMENT ON COLUMN public.profiles.cpf IS 'CPF opcional. AbacatePay exige para PIX. Nunca logar.';

-- Trigger updated_at
DROP TRIGGER IF EXISTS tg_profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER tg_profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- Trigger on auth.users insert → cria profile espelho
DROP TRIGGER IF EXISTS tg_auth_user_created ON auth.users;
CREATE TRIGGER tg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: self + admin
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_self_or_admin" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

-- UPDATE: self (campos não-privilegiados) + admin
-- role e is_anonymized só admin altera — checado via trigger.
DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- Bloqueia mudança de role fora de admin
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change role';
  END IF;
  IF OLD.is_anonymized IS DISTINCT FROM NEW.is_anonymized AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can anonymize profiles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_profiles_prevent_role_escalation ON public.profiles;
CREATE TRIGGER tg_profiles_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- INSERT: só via trigger handle_new_user (que usa SECURITY DEFINER) — negar direto.
-- DELETE: só admin.
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE
  USING (public.is_admin());
