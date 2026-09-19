ALTER TABLE public.brand_brain ADD COLUMN IF NOT EXISTS audience text;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS render_url text;
ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS template text NOT NULL DEFAULT 'carousel';

CREATE TABLE IF NOT EXISTS public.brand_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'document',
  file_path text NOT NULL,
  file_name text,
  mime_type text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_assets TO authenticated;
GRANT ALL ON public.brand_assets TO service_role;

ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own brand_assets" ON public.brand_assets;
CREATE POLICY "own brand_assets" ON public.brand_assets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS brand_assets_brand_idx ON public.brand_assets(brand_id);

DROP POLICY IF EXISTS "brand assets read own" ON storage.objects;
CREATE POLICY "brand assets read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'brand-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "brand assets insert own" ON storage.objects;
CREATE POLICY "brand assets insert own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "brand assets update own" ON storage.objects;
CREATE POLICY "brand assets update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "brand assets delete own" ON storage.objects;
CREATE POLICY "brand assets delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'brand-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
