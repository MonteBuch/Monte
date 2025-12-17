import { supabase } from './supabaseClient';
import { FACILITY_ID } from '../lib/constants';

export async function fetchGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('facility_id', FACILITY_ID)
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

export async function createGroup(group) {
  const { data, error } = await supabase
    .from('groups')
    .insert({
      facility_id: FACILITY_ID,
      name: group.name,
      color: group.color,
      icon: group.icon,
      position: group.position || 999,
      is_event_group: group.is_event_group || false,
    })
    .select()
    .single();

  if (error) {
    console.error('Fehler beim Erstellen der Gruppe:', error);
    throw error;
  }

  return data;
}

export async function updateGroup(id, updates) {
  const { data, error } = await supabase
    .from('groups')
    .update({
      name: updates.name,
      color: updates.color,
      icon: updates.icon,
      position: updates.position,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Fehler beim Aktualisieren der Gruppe:', error);
    throw error;
  }

  return data;
}

export async function deleteGroup(id) {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Fehler beim Löschen der Gruppe:', error);
    throw error;
  }
}

export async function reorderGroups(orderedIds) {
  // Update position for each group
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('groups')
      .update({ position: index })
      .eq('id', id)
  );

  const results = await Promise.all(updates);
  const errors = results.filter(r => r.error);

  if (errors.length > 0) {
    console.error('Fehler beim Sortieren der Gruppen:', errors);
    throw errors[0].error;
  }
}

// Für Migration: Kinder zählen die einer Gruppe zugeordnet sind
export async function countChildrenInGroup(groupId) {
  const { count, error } = await supabase
    .from('children')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId);

  if (error) {
    console.error('Fehler beim Zählen der Kinder:', error);
    return 0;
  }

  return count || 0;
}

// Für Migration: Team-Mitglieder zählen die einer Gruppe zugeordnet sind
export async function countTeamInGroup(groupId) {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('primary_group', groupId)
    .in('role', ['team', 'admin']);

  if (error) {
    console.error('Fehler beim Zählen der Team-Mitglieder:', error);
    return 0;
  }

  return count || 0;
}

// Für Migration: Kinder in andere Gruppe verschieben
export async function migrateChildrenToGroup(fromGroupId, toGroupId) {
  const { error } = await supabase
    .from('children')
    .update({ group_id: toGroupId })
    .eq('group_id', fromGroupId);

  if (error) {
    console.error('Fehler beim Verschieben der Kinder:', error);
    throw error;
  }
}

// Für Migration: Team-Mitglieder in andere Gruppe verschieben
export async function migrateTeamToGroup(fromGroupId, toGroupId) {
  const { error } = await supabase
    .from('profiles')
    .update({ primary_group: toGroupId })
    .eq('primary_group', fromGroupId)
    .in('role', ['team', 'admin']);

  if (error) {
    console.error('Fehler beim Verschieben der Team-Mitglieder:', error);
    throw error;
  }
}