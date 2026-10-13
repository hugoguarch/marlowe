ALTER TABLE public.brand_brain
  ADD COLUMN IF NOT EXISTS kit_version text NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS brand_values jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS icons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS agent_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS social_line text;

ALTER TABLE public.site_pages ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE TABLE public.site_page_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.site_pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_page_versions TO authenticated;
GRANT ALL ON public.site_page_versions TO service_role;
ALTER TABLE public.site_page_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their page versions" ON public.site_page_versions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX site_page_versions_page_idx ON public.site_page_versions(page_id, created_at DESC);