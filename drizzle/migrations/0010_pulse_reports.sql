CREATE TABLE public.pulse_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.pulse_clients(id) ON DELETE CASCADE,
  period_from date NOT NULL,
  period_to date NOT NULL,
  period_label text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pulse_reports TO authenticated;
GRANT ALL ON public.pulse_reports TO service_role;
ALTER TABLE public.pulse_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see reports" ON public.pulse_reports FOR SELECT TO authenticated USING (public.pulse_can_see(auth.uid(), client_id));
CREATE POLICY "write reports" ON public.pulse_reports FOR ALL TO authenticated
  USING (public.pulse_can_see(auth.uid(), client_id) AND public.pulse_my_role() IN ('admin','account_manager'))
  WITH CHECK (public.pulse_can_see(auth.uid(), client_id) AND public.pulse_my_role() IN ('admin','account_manager'));