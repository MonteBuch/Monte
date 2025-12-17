-- =====================================================
-- AUTH MIGRATION - Phase 1
-- Ausführen im Supabase SQL Editor
-- =====================================================

-- 1. REGISTRATION_CODES Tabelle
-- =====================================================
CREATE TABLE IF NOT EXISTS public.registration_codes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('parent', 'team', 'admin')),
    code text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(facility_id, role)
);

-- RLS für registration_codes
ALTER TABLE public.registration_codes ENABLE ROW LEVEL SECURITY;

-- Jeder kann Codes lesen (für Validierung bei Registrierung)
CREATE POLICY "Allow read registration_codes" ON public.registration_codes
    FOR SELECT USING (true);

-- Nur Admins können Codes ändern (später via RPC)
CREATE POLICY "Admin can manage registration_codes" ON public.registration_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );


-- 2. FEHLENDE INSERT POLICIES für profiles
-- =====================================================
-- Profile erstellen bei Registrierung (nur eigenes Profil)
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins können Profile erstellen (für User-Erstellung via Admin)
CREATE POLICY "Admin can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admins können Profile löschen
CREATE POLICY "Admin can delete profiles" ON public.profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );


-- 3. FEHLENDE INSERT/DELETE POLICIES für children
-- =====================================================
-- Eltern können eigene Kinder anlegen
CREATE POLICY "Users can insert own children" ON public.children
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Eltern können eigene Kinder löschen
CREATE POLICY "Users can delete own children" ON public.children
    FOR DELETE USING (auth.uid() = user_id);

-- Admins können alle Kinder verwalten
CREATE POLICY "Admin can insert children" ON public.children
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin can delete children" ON public.children
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );


-- 4. VALIDATE_REGISTRATION_CODE Funktion
-- =====================================================
-- Prüft ob ein Code für eine Rolle gültig ist
CREATE OR REPLACE FUNCTION public.validate_registration_code(
    p_code text,
    p_role text,
    p_facility_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.registration_codes
        WHERE code = p_code
        AND role = p_role
        AND (p_facility_id IS NULL OR facility_id = p_facility_id)
    );
END;
$$;


-- 5. DEFAULT CODES einfügen (falls noch keine existieren)
-- =====================================================
-- WICHTIG: Passe die facility_id an deine Einrichtung an!
-- Du kannst die facility_id mit diesem Query finden:
-- SELECT id, name FROM facilities;

-- Beispiel mit Platzhalter - ersetze 'DEINE_FACILITY_ID' mit der echten UUID:
/*
INSERT INTO public.registration_codes (facility_id, role, code)
VALUES
    ('DEINE_FACILITY_ID', 'parent', 'eltern2024'),
    ('DEINE_FACILITY_ID', 'team', 'team2024'),
    ('DEINE_FACILITY_ID', 'admin', 'admin2024')
ON CONFLICT (facility_id, role) DO NOTHING;
*/


-- 6. HILFSFUNKTION: Aktuellen User mit Profil laden
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'id', p.id,
        'email', u.email,
        'full_name', p.full_name,
        'role', p.role,
        'facility_id', p.facility_id,
        'primary_group', p.primary_group,
        'children', COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'id', c.id,
                'first_name', c.first_name,
                'birthday', c.birthday,
                'notes', c.notes,
                'group_id', c.group_id
            ))
            FROM public.children c
            WHERE c.user_id = p.id),
            '[]'::jsonb
        )
    )
    INTO result
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.id = auth.uid();

    RETURN result;
END;
$$;


-- =====================================================
-- NACH DEM AUSFÜHREN:
-- 1. Prüfe ob alles geklappt hat (keine Fehler)
-- 2. Finde deine facility_id: SELECT id, name FROM facilities;
-- 3. Füge die Default-Codes ein (Block 5 oben anpassen)
-- 4. Gib mir Bescheid, dann passe ich den Frontend-Code an
-- =====================================================
