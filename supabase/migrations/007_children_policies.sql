-- 007_children_policies.sql
-- Fehlende RLS-Policies für children-Tabelle hinzufügen

-- INSERT-Policy: User kann Kinder für sich selbst erstellen
CREATE POLICY "Users can insert own children"
ON public.children
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- DELETE-Policy: User kann eigene Kinder löschen
CREATE POLICY "Users can delete own children"
ON public.children
FOR DELETE
USING (
  auth.uid() = user_id
);

-- Bestehende UPDATE-Policy verbessern: nur eigene Kinder oder Admin
DROP POLICY IF EXISTS "Admin can update children" ON public.children;

CREATE POLICY "Users can update own children"
ON public.children
FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
