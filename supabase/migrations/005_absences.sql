-- =====================================================
-- PHASE 2: ABSENCES (Abwesenheitsmeldungen)
-- Ausführen im Supabase SQL Editor
-- =====================================================

-- 1. ABSENCES Tabelle
-- =====================================================
CREATE TABLE IF NOT EXISTS public.absences (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
    child_id uuid REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
    child_name text NOT NULL,  -- denormalisiert für schnelle Anzeige
    group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
    type text NOT NULL CHECK (type IN ('single', 'range')),
    date_from date NOT NULL,
    date_to date,  -- nur bei type='range'
    reason text NOT NULL CHECK (reason IN ('krankheit', 'urlaub', 'termin', 'sonstiges')),
    other_text text,  -- nur bei reason='sonstiges'
    status text DEFAULT 'new' CHECK (status IN ('new', 'read')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL  -- Elternteil der gemeldet hat
);

-- Index für häufige Queries
CREATE INDEX IF NOT EXISTS idx_absences_facility ON public.absences(facility_id);
CREATE INDEX IF NOT EXISTS idx_absences_child ON public.absences(child_id);
CREATE INDEX IF NOT EXISTS idx_absences_group ON public.absences(group_id);
CREATE INDEX IF NOT EXISTS idx_absences_dates ON public.absences(date_from, date_to);

-- RLS aktivieren
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;

-- Policies für absences
-- Eltern können ihre eigenen Meldungen sehen (über ihre Kinder)
CREATE POLICY "Users can view absences of own children" ON public.absences
    FOR SELECT USING (
        child_id IN (
            SELECT id FROM public.children WHERE user_id = auth.uid()
        )
    );

-- Eltern können Meldungen für ihre Kinder erstellen
CREATE POLICY "Users can create absences for own children" ON public.absences
    FOR INSERT WITH CHECK (
        child_id IN (
            SELECT id FROM public.children WHERE user_id = auth.uid()
        )
    );

-- Eltern können ihre eigenen Meldungen bearbeiten
CREATE POLICY "Users can update own absences" ON public.absences
    FOR UPDATE USING (
        child_id IN (
            SELECT id FROM public.children WHERE user_id = auth.uid()
        )
    );

-- Eltern können ihre eigenen Meldungen löschen
CREATE POLICY "Users can delete own absences" ON public.absences
    FOR DELETE USING (
        child_id IN (
            SELECT id FROM public.children WHERE user_id = auth.uid()
        )
    );

-- Team und Admin können alle Meldungen ihrer Facility sehen
CREATE POLICY "Team can view all absences" ON public.absences
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('team', 'admin')
            AND profiles.facility_id = absences.facility_id
        )
    );

-- Admin kann Meldungen bearbeiten/löschen
CREATE POLICY "Admin can manage all absences" ON public.absences
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
            AND profiles.facility_id = absences.facility_id
        )
    );


-- 2. ABSENCE_READ_STATUS Tabelle (per-User gelesen/ausgeblendet Status)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.absence_read_status (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    absence_id uuid REFERENCES public.absences(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status text DEFAULT 'new' CHECK (status IN ('new', 'read')),
    hidden boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(absence_id, user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_absence_read_status_user ON public.absence_read_status(user_id);

-- RLS aktivieren
ALTER TABLE public.absence_read_status ENABLE ROW LEVEL SECURITY;

-- User können nur ihre eigenen Status sehen/ändern
CREATE POLICY "Users can manage own read status" ON public.absence_read_status
    FOR ALL USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- 3. HILFSFUNKTION: Meldung mit Status für User laden
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_absences_for_user(
    p_user_id uuid,
    p_facility_id uuid,
    p_group_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    child_id uuid,
    child_name text,
    group_id uuid,
    type text,
    date_from date,
    date_to date,
    reason text,
    other_text text,
    status text,
    created_at timestamp with time zone,
    user_status text,
    hidden boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.child_id,
        a.child_name,
        a.group_id,
        a.type,
        a.date_from,
        a.date_to,
        a.reason,
        a.other_text,
        a.status,
        a.created_at,
        COALESCE(rs.status, 'new') as user_status,
        COALESCE(rs.hidden, false) as hidden
    FROM public.absences a
    LEFT JOIN public.absence_read_status rs
        ON rs.absence_id = a.id AND rs.user_id = p_user_id
    WHERE a.facility_id = p_facility_id
    AND (p_group_id IS NULL OR a.group_id = p_group_id)
    ORDER BY a.created_at DESC;
END;
$$;


-- =====================================================
-- NACH DEM AUSFÜHREN:
-- Prüfe ob Tabellen erstellt wurden:
-- SELECT * FROM absences LIMIT 5;
-- SELECT * FROM absence_read_status LIMIT 5;
-- =====================================================
