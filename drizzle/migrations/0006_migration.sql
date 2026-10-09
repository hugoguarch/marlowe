DELETE FROM public.pulse_metrics_daily WHERE source = 'sample';
DELETE FROM public.pulse_posts WHERE source = 'sample';
DELETE FROM public.pulse_reviews WHERE source = 'sample';
DELETE FROM public.pulse_connections WHERE status = 'sample';

ALTER TABLE public.pulse_metrics_daily ADD COLUMN IF NOT EXISTS site text NOT NULL DEFAULT '';
UPDATE public.pulse_metrics_daily m SET site = c.account_ref
  FROM public.pulse_connections c
  WHERE m.channel = 'search_console' AND c.client_id = m.client_id AND c.provider = 'search_console';
ALTER TABLE public.pulse_metrics_daily DROP CONSTRAINT pulse_metrics_daily_pkey;
ALTER TABLE public.pulse_metrics_daily ADD PRIMARY KEY (client_id, channel, site, date, metric);

ALTER TABLE public.pulse_connections DROP CONSTRAINT pulse_connections_client_id_provider_key;
ALTER TABLE public.pulse_connections ADD CONSTRAINT pulse_connections_client_provider_account_key UNIQUE (client_id, provider, account_ref);

DROP FUNCTION IF EXISTS public.pulse_series(uuid, date, date, text);
CREATE OR REPLACE FUNCTION public.pulse_series(_client uuid, _from date, _to date, _bucket text DEFAULT 'day', _site text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('b', b, 'ch', channel, 'm', metric, 'v', v) ORDER BY b), '[]'::jsonb)
  FROM (
    SELECT b, channel, metric,
      CASE WHEN metric = 'followers' THEN max(v)
           WHEN metric = 'position' THEN round(avg(v), 2)
           ELSE sum(v) END AS v
    FROM (
      SELECT date_trunc(_bucket, date)::date AS b, channel, metric, site,
        CASE WHEN metric = 'followers' THEN max(value)
             WHEN metric = 'position' THEN avg(value)
             ELSE sum(value) END AS v
      FROM public.pulse_metrics_daily
      WHERE client_id = _client AND date BETWEEN _from AND _to
        AND (_site IS NULL OR channel <> 'search_console' OR site = _site)
      GROUP BY 1, 2, 3, 4
    ) per_site
    GROUP BY 1, 2, 3
  ) s
$function$;
GRANT EXECUTE ON FUNCTION public.pulse_series(uuid, date, date, text, text) TO authenticated;