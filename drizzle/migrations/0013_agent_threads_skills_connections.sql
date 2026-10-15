CREATE TABLE public.agent_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_threads TO authenticated;
GRANT ALL ON public.agent_threads TO service_role;
ALTER TABLE public.agent_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own threads" ON public.agent_threads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX agent_threads_user_idx ON public.agent_threads (user_id, updated_at DESC);

ALTER TABLE public.chat_messages ADD COLUMN thread_id uuid REFERENCES public.agent_threads(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages ALTER COLUMN tools SET DEFAULT '[]'::jsonb;
ALTER TABLE public.chat_messages ALTER COLUMN attachments SET DEFAULT '[]'::jsonb;
CREATE INDEX chat_messages_thread_idx ON public.chat_messages (thread_id, created_at);

INSERT INTO public.agent_threads (user_id, title)
SELECT DISTINCT user_id, 'Earlier chat' FROM public.chat_messages;
UPDATE public.chat_messages m SET thread_id = t.id FROM public.agent_threads t WHERE t.user_id = m.user_id AND m.thread_id IS NULL;

ALTER TABLE public.agent_tasks ADD COLUMN client_id uuid;
ALTER TABLE public.agent_tasks ADD COLUMN thread_id uuid;
ALTER TABLE public.agent_tasks ADD COLUMN locked_until timestamptz;

CREATE TABLE public.agent_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  summary text NOT NULL DEFAULT '',
  instructions text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_skills TO authenticated;
GRANT ALL ON public.agent_skills TO service_role;
ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own skills" ON public.agent_skills FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.agent_settings (
  user_id uuid PRIMARY KEY,
  disabled_tools text[] NOT NULL DEFAULT '{}',
  disabled_skills text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_settings TO authenticated;
GRANT ALL ON public.agent_settings TO service_role;
ALTER TABLE public.agent_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.agent_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.agent_mcp_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  auth_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'unknown',
  last_error text,
  tool_names text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (id, user_id, name, url, enabled, status, last_error, tool_names, created_at) ON public.agent_mcp_servers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.agent_mcp_servers TO authenticated;
GRANT ALL ON public.agent_mcp_servers TO service_role;
ALTER TABLE public.agent_mcp_servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mcp servers" ON public.agent_mcp_servers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
COMMENT ON COLUMN public.agent_mcp_servers.auth_headers IS 'Secret request headers; readable only by the server (service role).';