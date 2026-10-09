ALTER TABLE public.pulse_connections ADD COLUMN IF NOT EXISTS last_error text, ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

CREATE TABLE public.client_meta_connections (
  client_id uuid PRIMARY KEY REFERENCES public.pulse_clients(id) ON DELETE CASCADE,
  fb_page_id text,
  fb_page_name text,
  ig_user_id text,
  ig_username text,
  ad_account_ids text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_meta_connections TO authenticated;
GRANT ALL ON public.client_meta_connections TO service_role;
ALTER TABLE public.client_meta_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see meta connections" ON public.client_meta_connections FOR SELECT TO authenticated USING (public.pulse_can_see(auth.uid(), client_id));
CREATE POLICY "admins manage meta connections" ON public.client_meta_connections FOR ALL TO authenticated USING (public.pulse_is_admin(auth.uid())) WITH CHECK (public.pulse_is_admin(auth.uid()));

CREATE TABLE public.meta_cache (
  client_id uuid NOT NULL,
  cache_key text NOT NULL,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, cache_key)
);
GRANT ALL ON public.meta_cache TO service_role;
ALTER TABLE public.meta_cache ENABLE ROW LEVEL SECURITY;