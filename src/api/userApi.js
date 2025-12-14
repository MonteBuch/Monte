// src/api/userApi.js
import { supabase } from "./supabaseClient";

export async function loadCurrentUser() {
  // 1) Auth User abrufen (Supabase-Login)
  const {
    data: { user: authUser },
    error: authError
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!authUser) return null;

  // 2) Profil + Kinder + Gruppenzugehörigkeit abrufen
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      primary_group,
      children (
        id,
        first_name,
        birthday,
        notes,
        group_id
      )
    `)
    .eq("id", authUser.id)
    .single();

  if (profileError) throw profileError;

  return profile;
}