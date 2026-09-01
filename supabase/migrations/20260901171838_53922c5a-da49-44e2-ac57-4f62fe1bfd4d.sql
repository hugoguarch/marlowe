ALTER TABLE public.waitlist_signups ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.waitlist_signups ALTER COLUMN business_name DROP NOT NULL;
GRANT UPDATE ON public.waitlist_signups TO anon;
DROP POLICY IF EXISTS "Anon can complete recent signup" ON public.waitlist_signups;
CREATE POLICY "Anon can complete recent signup" ON public.waitlist_signups FOR UPDATE TO anon USING (created_at > now() - interval '2 hours') WITH CHECK (created_at > now() - interval '2 hours');