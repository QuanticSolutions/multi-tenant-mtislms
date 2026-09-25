CREATE TABLE public.login_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL, success boolean NOT NULL DEFAULT false, attempted_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX login_attempts_email_time ON public.login_attempts (email, attempted_at DESC);
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;