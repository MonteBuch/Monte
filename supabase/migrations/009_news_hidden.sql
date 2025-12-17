-- 009_news_hidden.sql
-- Tabelle für ausgeblendete News pro Benutzer + News RLS Policies

-- =====================================================
-- TEIL 1: RLS Policies für news Tabelle (falls fehlend)
-- =====================================================

-- RLS aktivieren (falls noch nicht aktiv)
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Löschen und neu erstellen (um Duplikate zu vermeiden)
DROP POLICY IF EXISTS "Everyone can view news" ON public.news;
DROP POLICY IF EXISTS "Team and Admin can insert news" ON public.news;
DROP POLICY IF EXISTS "Team and Admin can update news" ON public.news;
DROP POLICY IF EXISTS "Team and Admin can delete news" ON public.news;

-- Jeder authentifizierte User kann News lesen
CREATE POLICY "Everyone can view news"
  ON public.news
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Team und Admin können News erstellen
CREATE POLICY "Team and Admin can insert news"
  ON public.news
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('team', 'admin')
    )
  );

-- Team und Admin können News aktualisieren
CREATE POLICY "Team and Admin can update news"
  ON public.news
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('team', 'admin')
    )
  );

-- Team und Admin können News löschen
CREATE POLICY "Team and Admin can delete news"
  ON public.news
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('team', 'admin')
    )
  );

-- =====================================================
-- TEIL 2: news_hidden Tabelle
-- =====================================================

-- Falls die Tabelle mit altem Schema existiert, löschen und neu erstellen
DROP TABLE IF EXISTS public.news_hidden;

-- news_hidden Tabelle erstellen
CREATE TABLE public.news_hidden (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  news_id uuid NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(news_id, user_id)
);

-- RLS aktivieren
ALTER TABLE public.news_hidden ENABLE ROW LEVEL SECURITY;

-- Policies für news_hidden
-- Jeder authentifizierte User kann seine eigenen hidden-Einträge lesen
CREATE POLICY "Users can view own hidden news"
  ON public.news_hidden
  FOR SELECT
  USING (auth.uid() = user_id);

-- Jeder authentifizierte User kann eigene hidden-Einträge erstellen
CREATE POLICY "Users can insert own hidden news"
  ON public.news_hidden
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Jeder authentifizierte User kann eigene hidden-Einträge löschen
CREATE POLICY "Users can delete own hidden news"
  ON public.news_hidden
  FOR DELETE
  USING (auth.uid() = user_id);
