CREATE TABLE public.pulse_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sector text,
  logo_url text,
  seed_terms text[] NOT NULL DEFAULT '{}',
  goals jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.pulse_user_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.pulse_clients(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'account_manager',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id, role)
);
CREATE TABLE public.pulse_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.pulse_clients(id) ON DELETE CASCADE,
  provider text NOT NULL,
  account_ref text,
  scopes text,
  token_expires_at timestamptz,
  last_sync_at timestamptz,
  status text NOT NULL DEFAULT 'sample',
  UNIQUE (client_id, provider)
);
CREATE TABLE public.pulse_metrics_daily (
  client_id uuid NOT NULL REFERENCES public.pulse_clients(id) ON DELETE CASCADE,
  channel text NOT NULL,
  date date NOT NULL,
  metric text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'sample',
  PRIMARY KEY (client_id, channel, date, metric)
);
CREATE TABLE public.pulse_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.pulse_clients(id) ON DELETE CASCADE,
  channel text NOT NULL,
  external_id text,
  published_at timestamptz NOT NULL,
  format text NOT NULL,
  caption text,
  permalink text,
  thumbnail_url text,
  reach integer NOT NULL DEFAULT 0,
  views integer NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  comments integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  saves integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'sample'
);
CREATE TABLE public.pulse_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.pulse_clients(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'google',
  external_id text,
  rating integer NOT NULL,
  text text,
  author text,
  created_at timestamptz NOT NULL DEFAULT now(),
  replied boolean NOT NULL DEFAULT false
);
CREATE INDEX pulse_metrics_lookup ON public.pulse_metrics_daily (client_id, date);
CREATE INDEX pulse_posts_lookup ON public.pulse_posts (client_id, published_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pulse_clients, public.pulse_user_access, public.pulse_connections, public.pulse_metrics_daily, public.pulse_posts, public.pulse_reviews TO authenticated;
GRANT ALL ON public.pulse_clients, public.pulse_user_access, public.pulse_connections, public.pulse_metrics_daily, public.pulse_posts, public.pulse_reviews TO service_role;

ALTER TABLE public.pulse_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_user_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_reviews ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.pulse_is_admin(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.pulse_user_access WHERE user_id = _uid AND role = 'admin')
$$;
CREATE OR REPLACE FUNCTION public.pulse_can_see(_uid uuid, _client uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.pulse_is_admin(_uid) OR EXISTS (
    SELECT 1 FROM public.pulse_user_access WHERE user_id = _uid AND client_id = _client)
$$;
CREATE OR REPLACE FUNCTION public.pulse_my_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.pulse_is_admin(auth.uid()) THEN 'admin'
    WHEN EXISTS (SELECT 1 FROM public.pulse_user_access WHERE user_id = auth.uid() AND role = 'account_manager') THEN 'account_manager'
    WHEN EXISTS (SELECT 1 FROM public.pulse_user_access WHERE user_id = auth.uid()) THEN 'client'
    ELSE 'none' END
$$;
-- First person to open Pulse becomes the admin; afterwards admins grant access.
CREATE OR REPLACE FUNCTION public.pulse_claim_admin() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'none'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pulse_user_access WHERE role = 'admin') THEN
    INSERT INTO public.pulse_user_access (user_id, client_id, role) VALUES (auth.uid(), NULL, 'admin');
  END IF;
  RETURN public.pulse_my_role();
END $$;
REVOKE EXECUTE ON FUNCTION public.pulse_claim_admin() FROM anon;

CREATE POLICY "see assigned clients" ON public.pulse_clients FOR SELECT TO authenticated USING (public.pulse_can_see(auth.uid(), id));
CREATE POLICY "admins manage clients" ON public.pulse_clients FOR ALL TO authenticated USING (public.pulse_is_admin(auth.uid())) WITH CHECK (public.pulse_is_admin(auth.uid()));
CREATE POLICY "see own access" ON public.pulse_user_access FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.pulse_is_admin(auth.uid()));
CREATE POLICY "admins manage access" ON public.pulse_user_access FOR ALL TO authenticated USING (public.pulse_is_admin(auth.uid())) WITH CHECK (public.pulse_is_admin(auth.uid()));
CREATE POLICY "see connections" ON public.pulse_connections FOR SELECT TO authenticated USING (public.pulse_can_see(auth.uid(), client_id));
CREATE POLICY "admins manage connections" ON public.pulse_connections FOR ALL TO authenticated USING (public.pulse_is_admin(auth.uid())) WITH CHECK (public.pulse_is_admin(auth.uid()));
CREATE POLICY "see metrics" ON public.pulse_metrics_daily FOR SELECT TO authenticated USING (public.pulse_can_see(auth.uid(), client_id));
CREATE POLICY "see posts" ON public.pulse_posts FOR SELECT TO authenticated USING (public.pulse_can_see(auth.uid(), client_id));
CREATE POLICY "see reviews" ON public.pulse_reviews FOR SELECT TO authenticated USING (public.pulse_can_see(auth.uid(), client_id));

-- Sample data adapter seed
INSERT INTO public.pulse_clients (name, sector, seed_terms, goals) VALUES
 ('Why Media','Marketing agency','{property marketing agency,mayfair marketing}','{"instagram_followers":20000}'),
 ('CLS Holdings','Commercial property','{office space london,commercial property investment}','{"linkedin_followers":15000}'),
 ('Devine Group','Residential development','{new build homes,luxury apartments}','{"instagram_followers":30000}'),
 ('The Heart Shopping Centre','Retail destination','{shopping centre walton,things to do walton}','{"instagram_followers":25000}'),
 ('Hempstead Valley','Retail destination','{hempstead valley shops,gillingham shopping}','{"facebook_followers":40000}'),
 ('Colecroft','Property management','{block management,property management london}','{}'),
 ('UKBC','Business centres','{serviced offices,meeting rooms}','{"linkedin_followers":8000}'),
 ('WSW Refurbishments','Construction','{office refurbishment,fit out contractor}','{}');

INSERT INTO public.pulse_connections (client_id, provider, account_ref, last_sync_at, status)
SELECT c.id, p, lower(replace(c.name,' ','')), now() - interval '3 hours', 'sample'
FROM public.pulse_clients c
CROSS JOIN unnest(ARRAY['instagram','facebook','linkedin','gbp','website','search_console']) p;
INSERT INTO public.pulse_connections (client_id, provider, account_ref, last_sync_at, status)
SELECT c.id, 'tiktok', lower(replace(c.name,' ','')), now() - interval '3 hours', 'sample'
FROM public.pulse_clients c WHERE c.name IN ('Why Media','The Heart Shopping Centre','Hempstead Valley','Devine Group');
INSERT INTO public.pulse_connections (client_id, provider, account_ref, last_sync_at, status)
SELECT c.id, 'youtube', lower(replace(c.name,' ','')), now() - interval '3 hours', 'sample'
FROM public.pulse_clients c WHERE c.name IN ('Why Media','Devine Group');

WITH base AS (
  SELECT c.id, cn.provider AS ch, (abs(hashtext(c.name)) % 9 + 3) AS scale
  FROM public.pulse_clients c JOIN public.pulse_connections cn ON cn.client_id = c.id
  WHERE cn.provider IN ('instagram','facebook','linkedin','tiktok','youtube')
), days AS (SELECT generate_series(current_date - 400, current_date - 1, '1 day')::date AS d)
INSERT INTO public.pulse_metrics_daily (client_id, channel, date, metric, value)
SELECT b.id, b.ch, days.d, m.metric,
  CASE m.metric
    WHEN 'followers' THEN round(b.scale * 900 * (1 + (days.d - (current_date - 400)) * 0.0012))
    WHEN 'reach' THEN round(b.scale * 300 * (0.6 + (abs(hashtext(b.id::text||b.ch||days.d)) % 1000) / 1000.0))
    WHEN 'views' THEN round(b.scale * 520 * (0.6 + (abs(hashtext(b.ch||days.d||b.id::text)) % 1000) / 1000.0))
    WHEN 'engagements' THEN round(b.scale * 18 * (0.5 + (abs(hashtext(days.d||b.id::text||b.ch)) % 1000) / 1000.0))
    WHEN 'posts' THEN CASE WHEN abs(hashtext(b.id::text||days.d||b.ch)) % 3 = 0 THEN 1 ELSE 0 END
  END
FROM base b CROSS JOIN days CROSS JOIN unnest(ARRAY['followers','reach','views','engagements','posts']) m(metric);

WITH days AS (SELECT generate_series(current_date - 400, current_date - 1, '1 day')::date AS d)
INSERT INTO public.pulse_metrics_daily (client_id, channel, date, metric, value)
SELECT c.id, ch.channel, days.d, ch.metric,
  CASE ch.metric
    WHEN 'sessions' THEN round((abs(hashtext(c.name)) % 7 + 2) * 140 * (0.6 + (abs(hashtext(c.id::text||days.d)) % 1000)/1000.0))
    WHEN 'conversions' THEN round((abs(hashtext(c.name)) % 7 + 2) * 3 * (0.4 + (abs(hashtext(days.d||c.id::text)) % 1000)/1000.0))
    WHEN 'ai_sessions' THEN round((abs(hashtext(c.name)) % 5 + 1) * 2 * (1 + (days.d - (current_date - 400)) * 0.004) * (0.5 + (abs(hashtext(c.name||days.d)) % 1000)/1000.0))
    WHEN 'clicks' THEN round((abs(hashtext(c.name)) % 7 + 2) * 45 * (0.6 + (abs(hashtext('c'||c.id::text||days.d)) % 1000)/1000.0))
    WHEN 'impressions' THEN round((abs(hashtext(c.name)) % 7 + 2) * 1300 * (0.6 + (abs(hashtext('i'||c.id::text||days.d)) % 1000)/1000.0))
    WHEN 'position' THEN round((8 + (abs(hashtext('p'||c.id::text||days.d)) % 600)/100.0)::numeric, 2)
    WHEN 'profile_views' THEN round((abs(hashtext(c.name)) % 6 + 2) * 60 * (0.6 + (abs(hashtext('v'||c.id::text||days.d)) % 1000)/1000.0))
    WHEN 'calls' THEN abs(hashtext('k'||c.id::text||days.d)) % 6
    WHEN 'direction_requests' THEN abs(hashtext('d'||c.id::text||days.d)) % 12
    WHEN 'website_clicks' THEN abs(hashtext('w'||c.id::text||days.d)) % 25
  END
FROM public.pulse_clients c CROSS JOIN days CROSS JOIN (VALUES
  ('website','sessions'),('website','conversions'),('website','ai_sessions'),
  ('search_console','clicks'),('search_console','impressions'),('search_console','position'),
  ('gbp','profile_views'),('gbp','calls'),('gbp','direction_requests'),('gbp','website_clicks')) ch(channel, metric);

INSERT INTO public.pulse_posts (client_id, channel, external_id, published_at, format, caption, permalink, reach, views, likes, comments, shares, saves)
SELECT c.id, ch, 'sample-'||g, now() - (g * interval '19 hours'),
  (ARRAY['reel','carousel','static','story','video'])[1 + abs(hashtext(c.name||g)) % 5],
  (ARRAY['Behind the scenes at the new launch','Five things buyers ask first','A morning on site','Meet the team','Before and after: the reception refit','What 2027 holds for the market','Open house this weekend','The view from the top floor'])[1 + abs(hashtext(g||c.name)) % 8],
  'https://example.com/p/'||g,
  800 + abs(hashtext('r'||c.name||g)) % 9000, 1200 + abs(hashtext('v'||c.name||g)) % 15000,
  40 + abs(hashtext('l'||c.name||g)) % 600, abs(hashtext('c'||c.name||g)) % 60,
  abs(hashtext('s'||c.name||g)) % 40, abs(hashtext('a'||c.name||g)) % 80
FROM public.pulse_clients c CROSS JOIN generate_series(1, 120) g
CROSS JOIN LATERAL (SELECT (ARRAY['instagram','facebook','linkedin'])[1 + g % 3] AS ch) x;

INSERT INTO public.pulse_reviews (client_id, rating, text, author, created_at, replied)
SELECT c.id,
  (ARRAY[5,5,5,4,4,5,3,2,5,4,1,5])[1 + abs(hashtext(c.name||g)) % 12],
  (ARRAY['Brilliant team, really responsive.','Lovely experience from start to finish.','Good, though parking was tricky.','Took a while to hear back.','Exceptional service, would recommend.','Not what we were promised.'])[1 + abs(hashtext(g||c.name)) % 6],
  (ARRAY['Sarah K','James P','Amira H','Tom W','Priya S','Daniel R','Lucy M'])[1 + g % 7],
  now() - (g * interval '4 days'), g % 3 <> 0
FROM public.pulse_clients c CROSS JOIN generate_series(1, 40) g;