import { supabase } from "./supabaseClient";

export async function fetchListsByGroup(groupId) {
  const { data, error } = await supabase
    .from("group_lists")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fehler beim Laden der Listen:", error);
    throw error;
  }

  return data || [];
}