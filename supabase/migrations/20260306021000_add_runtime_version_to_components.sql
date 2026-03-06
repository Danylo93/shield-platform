ALTER TABLE public.components
ADD COLUMN IF NOT EXISTS runtime_version text;
