CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'My brand',
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own brands" ON public.brands FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.brand_brain (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  logo_url text,
  palette jsonb NOT NULL DEFAULT '[]'::jsonb,
  typography jsonb NOT NULL DEFAULT '{}'::jsonb,
  tone_of_voice jsonb NOT NULL DEFAULT '[]'::jsonb,
  personas jsonb NOT NULL DEFAULT '[]'::jsonb,
  learned jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_brain TO authenticated;
GRANT ALL ON public.brand_brain TO service_role;
ALTER TABLE public.brand_brain ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own brand_brain" ON public.brand_brain FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  caption text,
  format text NOT NULL DEFAULT 'post',
  channel text NOT NULL DEFAULT 'Instagram',
  status text NOT NULL DEFAULT 'draft',
  slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  media_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_items TO authenticated;
GRANT ALL ON public.content_items TO service_role;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own content_items" ON public.content_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content_item_id uuid REFERENCES public.content_items(id) ON DELETE SET NULL,
  title text NOT NULL,
  channel text NOT NULL DEFAULT 'Instagram',
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'queued',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule TO authenticated;
GRANT ALL ON public.schedule TO service_role;
ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own schedule" ON public.schedule FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'Instagram',
  metric text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  delta numeric,
  captured_for date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metrics TO authenticated;
GRANT ALL ON public.metrics TO service_role;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own metrics" ON public.metrics FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'user',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chat_messages" ON public.chat_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.action_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'publish',
  label text NOT NULL,
  detail text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_queue TO authenticated;
GRANT ALL ON public.action_queue TO service_role;
ALTER TABLE public.action_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own action_queue" ON public.action_queue FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.connected_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  account_name text,
  connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connected_accounts TO authenticated;
GRANT ALL ON public.connected_accounts TO service_role;
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own connected_accounts" ON public.connected_accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_chat_messages_user_created ON public.chat_messages (user_id, created_at);
CREATE INDEX idx_schedule_user_time ON public.schedule (user_id, scheduled_for);
CREATE INDEX idx_content_items_user ON public.content_items (user_id, created_at);
CREATE INDEX idx_metrics_user_date ON public.metrics (user_id, captured_for);