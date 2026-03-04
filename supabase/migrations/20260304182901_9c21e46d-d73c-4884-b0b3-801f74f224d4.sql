
-- Add squad column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS squad TEXT NOT NULL DEFAULT '';

-- Add squad to components for filtering
ALTER TABLE public.components ADD COLUMN IF NOT EXISTS squad TEXT NOT NULL DEFAULT '';
