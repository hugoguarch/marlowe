CREATE TABLE public.pulse_linkedin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id text NOT NULL UNIQUE,
  name text,
  access_token_enc text NOT NULL,
  refresh_token_enc text,
  expires_at timestamptz,
  scopes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pulse_linkedin_accounts TO service_role;
ALTER TABLE public.pulse_linkedin_accounts ENABLE ROW LEVEL SECURITY;