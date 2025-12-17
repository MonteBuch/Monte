-- =====================================================
-- MUST_RESET_PASSWORD Feld für Admin-initiierte Resets
-- Ausführen im Supabase SQL Editor
-- =====================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS must_reset_password boolean DEFAULT false;
