--
-- PostgreSQL database dump
--

\restrict JDDqrKDuoPPyVHf3nTBb8YESecl74nKRrq0svMY8Z23WKY5F9hFUFKso2ueU0ZN

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: admin_create_user(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_create_user(p_email text, p_password text, p_full_name text, p_role text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  new_user_id uuid;
begin
  -- Auth User
  insert into auth.users (email, encrypted_password)
  values (
    p_email,
    crypt(p_password, gen_salt('bf'))
  )
  returning id into new_user_id;

  -- Profile
  insert into profiles (id, full_name, role)
  values (new_user_id, p_full_name, p_role);

  return new_user_id;
end;
$$;


--
-- Name: admin_delete_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_user(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  delete from children where parent_id = p_user_id;
  delete from profiles where id = p_user_id;
  delete from auth.users where id = p_user_id;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: children; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.children (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    facility_id uuid NOT NULL,
    group_id uuid,
    first_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    birthday date,
    notes text,
    user_id uuid
);


--
-- Name: facilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: group_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_lists (
    id uuid NOT NULL,
    group_id uuid NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    items jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    facility_id uuid NOT NULL,
    name text NOT NULL,
    color text,
    icon text,
    is_event_group boolean DEFAULT false NOT NULL,
    "position" integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: news; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.news (
    id uuid NOT NULL,
    facility_id uuid,
    group_id uuid,
    text text NOT NULL,
    date timestamp with time zone NOT NULL,
    target text NOT NULL,
    attachments jsonb,
    created_by text NOT NULL,
    CONSTRAINT news_target_check CHECK ((target = ANY (ARRAY['all'::text, 'group'::text])))
);


--
-- Name: news_hidden; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.news_hidden (
    id uuid NOT NULL,
    news_id uuid NOT NULL,
    username text NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    facility_id uuid,
    full_name text,
    role text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    primary_group uuid,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['parent'::text, 'team'::text, 'admin'::text])))
);


--
-- Name: children children_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.children
    ADD CONSTRAINT children_pkey PRIMARY KEY (id);


--
-- Name: facilities facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_pkey PRIMARY KEY (id);


--
-- Name: group_lists group_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_lists
    ADD CONSTRAINT group_lists_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: news_hidden news_hidden_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news_hidden
    ADD CONSTRAINT news_hidden_pkey PRIMARY KEY (id);


--
-- Name: news news_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: children children_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.children
    ADD CONSTRAINT children_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;


--
-- Name: children children_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.children
    ADD CONSTRAINT children_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;


--
-- Name: children children_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.children
    ADD CONSTRAINT children_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: groups groups_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;


--
-- Name: news_hidden news_hidden_news_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news_hidden
    ADD CONSTRAINT news_hidden_news_id_fkey FOREIGN KEY (news_id) REFERENCES public.news(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_primary_group_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_primary_group_fkey FOREIGN KEY (primary_group) REFERENCES public.groups(id);


--
-- Name: children Admin can update children; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can update children" ON public.children FOR UPDATE USING (true);


--
-- Name: profiles Admin can update profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can update profiles" ON public.profiles FOR UPDATE USING (true);


--
-- Name: children Allow read children; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read children" ON public.children FOR SELECT USING (true);


--
-- Name: profiles Allow read profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read profiles" ON public.profiles FOR SELECT USING (true);


--
-- Name: children; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict JDDqrKDuoPPyVHf3nTBb8YESecl74nKRrq0svMY8Z23WKY5F9hFUFKso2ueU0ZN

