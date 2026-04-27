-- Migration 11 — Storage bucket product-photos (ADR 0008 D8)
-- Bucket público (read livre), write admin-only.

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-photos', 'product-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies
DROP POLICY IF EXISTS "product_photos_select_public" ON storage.objects;
CREATE POLICY "product_photos_select_public" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-photos');

DROP POLICY IF EXISTS "product_photos_insert_admin" ON storage.objects;
CREATE POLICY "product_photos_insert_admin" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'product-photos' AND public.is_admin());

DROP POLICY IF EXISTS "product_photos_update_admin" ON storage.objects;
CREATE POLICY "product_photos_update_admin" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'product-photos' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-photos' AND public.is_admin());

DROP POLICY IF EXISTS "product_photos_delete_admin" ON storage.objects;
CREATE POLICY "product_photos_delete_admin" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'product-photos' AND public.is_admin());
