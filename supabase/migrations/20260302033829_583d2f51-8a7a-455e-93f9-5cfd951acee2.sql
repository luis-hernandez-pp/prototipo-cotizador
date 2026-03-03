-- Create product-mockups storage bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-mockups',
  'product-mockups',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'product_mockups_public_read' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "product_mockups_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'product-mockups');
  END IF;
END $$;

-- Allow team members to upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'product_mockups_team_upload' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "product_mockups_team_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-mockups' AND is_team_member(auth.uid()));
  END IF;
END $$;

-- Allow team members to delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'product_mockups_team_delete' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "product_mockups_team_delete" ON storage.objects FOR DELETE USING (bucket_id = 'product-mockups' AND is_team_member(auth.uid()));
  END IF;
END $$;