CREATE OR REPLACE FUNCTION public.pulse_series(_client uuid, _from date, _to date, _bucket text DEFAULT 'day')
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('b', b, 'ch', channel, 'm', metric, 'v', v) ORDER BY b), '[]'::jsonb)
  FROM (
    SELECT date_trunc(_bucket, date)::date AS b, channel, metric,
      CASE WHEN metric IN ('followers') THEN max(value)
           WHEN metric IN ('position') THEN round(avg(value), 2)
           ELSE sum(value) END AS v
    FROM public.pulse_metrics_daily
    WHERE client_id = _client AND date BETWEEN _from AND _to
    GROUP BY 1, 2, 3
  ) s
$$;
GRANT EXECUTE ON FUNCTION public.pulse_series(uuid, date, date, text) TO authenticated;