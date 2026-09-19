ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS daily_target integer NOT NULL DEFAULT 1;

ALTER TABLE public.brand_assets ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS brand_scope uuid;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS external_account_id text;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS access_token_ciphertext text;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS refresh_token_ciphertext text;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS scopes text;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.schedule ADD COLUMN IF NOT EXISTS external_post_id text;
ALTER TABLE public.schedule ADD COLUMN IF NOT EXISTS posted_at timestamptz;

CREATE INDEX IF NOT EXISTS brands_user_default_idx ON public.brands (user_id, is_default);
CREATE INDEX IF NOT EXISTS schedule_user_posted_idx ON public.schedule (user_id, posted_at);