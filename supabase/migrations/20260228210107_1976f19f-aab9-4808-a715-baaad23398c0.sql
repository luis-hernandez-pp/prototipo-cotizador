
-- Storage RLS policies for product-images bucket
-- Allow team members to upload, update and delete product images
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'team_product_images_insert') THEN
    CREATE POLICY "team_product_images_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'product-images'
      AND public.is_team_member(auth.uid())
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'team_product_images_update') THEN
    CREATE POLICY "team_product_images_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'product-images'
      AND public.is_team_member(auth.uid())
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'team_product_images_delete') THEN
    CREATE POLICY "team_product_images_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'product-images'
      AND public.is_team_member(auth.uid())
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'public_product_images_select') THEN
    CREATE POLICY "public_product_images_select"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'product-images');
  END IF;
END $$;
