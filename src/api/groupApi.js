import { supabase } from './supabaseClient';

export async function fetchGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('position', { ascending: true });

  if (error) {
    console.error('Fehler beim Laden der Gruppen:', error);
    throw error;
  }

  // ✅ Eventgruppe IMMER an erste Stelle zwingen
  const sorted = [...data].sort((a, b) => {
    if (a.is_event_group) return -1;
    if (b.is_event_group) return 1;
    return (a.position ?? 999) - (b.position ?? 999);
  });

  return sorted;
}