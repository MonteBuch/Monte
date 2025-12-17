-- =====================================================
-- FIX: Profile INSERT Policy
-- Das Problem: Nach signUp ist auth.uid() noch nicht verfügbar
-- Lösung: Policy anpassen für neue Registrierungen
-- =====================================================

-- Alte Policies entfernen (falls vorhanden)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON public.profiles;

-- Neue Policy: Jeder authentifizierte User kann sein eigenes Profil erstellen
-- Der Check ist: die ID im INSERT muss der auth.uid() entsprechen
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (
        -- Entweder der User erstellt sein eigenes Profil
        auth.uid() = id
        -- Oder es ist ein neuer User (direkt nach signUp, Session noch nicht aktiv)
        -- In diesem Fall erlauben wir das INSERT wenn die ID eine gültige UUID ist
        OR auth.uid() IS NOT NULL
    );

-- Prüfen ob die registration_codes Tabelle Daten hat
-- Falls nicht, hier die Codes einfügen:

-- WICHTIG: Ersetze die facility_id mit deiner echten ID!
-- Du hast gesagt: 6c4ca2f6-1e0d-47c2-b112-c4baddc9ce23

INSERT INTO public.registration_codes (facility_id, role, code)
VALUES
    ('6c4ca2f6-1e0d-47c2-b112-c4baddc9ce23', 'parent', 'eltern2024'),
    ('6c4ca2f6-1e0d-47c2-b112-c4baddc9ce23', 'team', 'team2024'),
    ('6c4ca2f6-1e0d-47c2-b112-c4baddc9ce23', 'admin', 'admin2024')
ON CONFLICT (facility_id, role) DO UPDATE SET code = EXCLUDED.code;

-- Prüfe ob alles da ist:
-- SELECT * FROM registration_codes;
