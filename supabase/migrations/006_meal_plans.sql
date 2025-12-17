-- =====================================================
-- PHASE 3: MEAL PLANS (Speiseplan)
-- Ausführen im Supabase SQL Editor
-- =====================================================

-- 1. MEAL_PLANS Tabelle (Wochenplan)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.meal_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
    -- Woche im ISO-Format (z.B. "2024-W51")
    week_key text NOT NULL,
    -- Tages-Key (monday, tuesday, wednesday, thursday, friday)
    day_key text NOT NULL CHECK (day_key IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday')),
    -- Mahlzeiten
    breakfast text DEFAULT '',
    lunch text DEFAULT '',
    snack text DEFAULT '',
    allergy_note text DEFAULT '',
    -- Timestamps
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    -- Unique: Eine Zeile pro Tag pro Woche pro Facility
    UNIQUE(facility_id, week_key, day_key)
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_meal_plans_facility ON public.meal_plans(facility_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_week ON public.meal_plans(week_key);

-- RLS aktivieren
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

-- Alle authentifizierten User können Speisepläne lesen
CREATE POLICY "Users can view meal plans" ON public.meal_plans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.facility_id = meal_plans.facility_id
        )
    );

-- Team und Admin können Speisepläne bearbeiten
CREATE POLICY "Team can manage meal plans" ON public.meal_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('team', 'admin')
            AND profiles.facility_id = meal_plans.facility_id
        )
    );


-- 2. MEAL_OPTIONS Tabelle (Auswahllisten)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.meal_options (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
    -- Typ: breakfast, lunch, snack
    meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'snack')),
    -- Option Name
    name text NOT NULL,
    -- Position für Sortierung
    position integer DEFAULT 0,
    -- Timestamps
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    -- Unique: Kein doppelter Name pro Typ pro Facility
    UNIQUE(facility_id, meal_type, name)
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_meal_options_facility ON public.meal_options(facility_id);
CREATE INDEX IF NOT EXISTS idx_meal_options_type ON public.meal_options(meal_type);

-- RLS aktivieren
ALTER TABLE public.meal_options ENABLE ROW LEVEL SECURITY;

-- Alle authentifizierten User können Optionen lesen
CREATE POLICY "Users can view meal options" ON public.meal_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.facility_id = meal_options.facility_id
        )
    );

-- Team und Admin können Optionen bearbeiten
CREATE POLICY "Team can manage meal options" ON public.meal_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('team', 'admin')
            AND profiles.facility_id = meal_options.facility_id
        )
    );


-- 3. HILFSFUNKTION: Aktuellen Wochen-Key berechnen
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_current_week_key()
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT to_char(now(), 'IYYY-"W"IW');
$$;


-- 4. HILFSFUNKTION: Speiseplan für Woche laden/erstellen
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_or_create_meal_plan(
    p_facility_id uuid,
    p_week_key text DEFAULT NULL
)
RETURNS TABLE (
    day_key text,
    breakfast text,
    lunch text,
    snack text,
    allergy_note text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_week_key text;
BEGIN
    -- Default: aktuelle Woche
    v_week_key := COALESCE(p_week_key, public.get_current_week_key());

    -- Für jeden Wochentag sicherstellen dass Eintrag existiert
    INSERT INTO public.meal_plans (facility_id, week_key, day_key)
    VALUES
        (p_facility_id, v_week_key, 'monday'),
        (p_facility_id, v_week_key, 'tuesday'),
        (p_facility_id, v_week_key, 'wednesday'),
        (p_facility_id, v_week_key, 'thursday'),
        (p_facility_id, v_week_key, 'friday')
    ON CONFLICT (facility_id, week_key, day_key) DO NOTHING;

    -- Daten zurückgeben
    RETURN QUERY
    SELECT
        mp.day_key,
        mp.breakfast,
        mp.lunch,
        mp.snack,
        mp.allergy_note
    FROM public.meal_plans mp
    WHERE mp.facility_id = p_facility_id
    AND mp.week_key = v_week_key
    ORDER BY
        CASE mp.day_key
            WHEN 'monday' THEN 1
            WHEN 'tuesday' THEN 2
            WHEN 'wednesday' THEN 3
            WHEN 'thursday' THEN 4
            WHEN 'friday' THEN 5
        END;
END;
$$;


-- =====================================================
-- NACH DEM AUSFÜHREN:
-- Prüfe ob Tabellen erstellt wurden:
-- SELECT * FROM meal_plans LIMIT 5;
-- SELECT * FROM meal_options LIMIT 5;
-- SELECT get_current_week_key();
-- =====================================================
