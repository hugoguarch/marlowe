CREATE TABLE public.pulse_google_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  refresh_token_enc text NOT NULL,
  scopes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pulse_google_accounts TO service_role;
ALTER TABLE public.pulse_google_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_connections ADD COLUMN IF NOT EXISTS oauth_account_id uuid, ADD COLUMN IF NOT EXISTS account_name text;