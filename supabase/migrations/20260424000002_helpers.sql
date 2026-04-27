-- Migration 02 — Helpers (ADR 0008 D2, D17)
-- is_admin() encapsula verificação de role. handle_new_user() popula profile após signup.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
EXCEPTION
  WHEN undefined_table THEN
    -- Migration 02 corre antes da 03; defere validação pra runtime.
    RETURN false;
END;
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Retorna true se usuário autenticado tem role admin. Usado em RLS policies.';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, phone)
  VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'last_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger on auth.users INSERT — cria row espelho em public.profiles.';
