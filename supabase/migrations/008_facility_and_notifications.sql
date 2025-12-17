-- 008_facility_and_notifications.sql
-- Erweitere facilities-Tabelle und erstelle notification_preferences

-- 1. Facilities-Tabelle erweitern (falls Felder fehlen)
ALTER TABLE public.facilities
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS opening_hours text,
ADD COLUMN IF NOT EXISTS info_text text;

-- 2. Notification Preferences Tabelle erstellen
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    category text NOT NULL,
    preference text NOT NULL DEFAULT 'app',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(user_id, category),
    CONSTRAINT valid_category CHECK (category IN ('news', 'lists', 'food', 'absences', 'birthdays')),
    CONSTRAINT valid_preference CHECK (preference IN ('email', 'app', 'both', 'off'))
);

-- 3. RLS für notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- User kann eigene Preferences lesen
CREATE POLICY "Users can read own notification preferences"
ON public.notification_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- User kann eigene Preferences erstellen
CREATE POLICY "Users can insert own notification preferences"
ON public.notification_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- User kann eigene Preferences updaten
CREATE POLICY "Users can update own notification preferences"
ON public.notification_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- User kann eigene Preferences löschen
CREATE POLICY "Users can delete own notification preferences"
ON public.notification_preferences
FOR DELETE
USING (auth.uid() = user_id);
