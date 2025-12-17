-- =====================================================
-- TRIGGER: Automatisch Profil erstellen bei neuem Auth-User
-- =====================================================

-- 1. Funktion die bei neuem Auth-User aufgerufen wird
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, facility_id, full_name, role)
    VALUES (
        NEW.id,
        '6c4ca2f6-1e0d-47c2-b112-c4baddc9ce23',  -- Default facility
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Neuer Benutzer'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'parent')
    );
    RETURN NEW;
END;
$$;

-- 2. Trigger auf auth.users Tabelle
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. RLS Policy für profiles anpassen - UPDATE statt INSERT für eigenes Profil
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON public.profiles;

-- Users können ihr eigenes Profil updaten (wird vom Trigger erstellt)
-- Die bestehende UPDATE Policy sollte das bereits abdecken

-- 4. Test: Prüfe ob Trigger existiert
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
