CREATE TABLE public.email_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled email',
  subject text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  scheduled_for timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_designs TO authenticated;
GRANT ALL ON public.email_designs TO service_role;
ALTER TABLE public.email_designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own email designs" ON public.email_designs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.site_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled page',
  slug text NOT NULL DEFAULT '/',
  status text NOT NULL DEFAULT 'draft',
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_pages TO authenticated;
GRANT ALL ON public.site_pages TO service_role;
ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own site pages" ON public.site_pages FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.cms_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  collection text NOT NULL DEFAULT 'Insights',
  title text NOT NULL DEFAULT 'Untitled entry',
  status text NOT NULL DEFAULT 'Draft',
  category text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_entries TO authenticated;
GRANT ALL ON public.cms_entries TO service_role;
ALTER TABLE public.cms_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cms entries" ON public.cms_entries FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());