// src/lib/notificationTriggers.js
import { supabase } from "../api/supabaseClient";
import { FACILITY_ID } from "./constants";

/**
 * Findet alle Kinder, die HEUTE Geburtstag haben und in der Stammgruppe
 * des Team-Users sind.
 */
export async function getTodayBirthdaysForUser(user) {
  if (!user || user.role !== "team" || !user.primaryGroup) return [];

  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  try {
    // Kinder aus Supabase laden mit Eltern-Info
    const { data: children, error } = await supabase
      .from("children")
      .select(`
        id,
        first_name,
        birthday,
        group_id,
        user_id,
        profiles!children_user_id_fkey (
          full_name
        )
      `)
      .eq("facility_id", FACILITY_ID)
      .eq("group_id", user.primaryGroup)
      .not("birthday", "is", null);

    if (error) throw error;

    const result = [];

    (children || []).forEach((child) => {
      if (!child.birthday) return;

      const bd = new Date(child.birthday);
      if (Number.isNaN(bd.getTime())) return;

      const bm = bd.getMonth() + 1;
      const bdDay = bd.getDate();

      if (bm === todayMonth && bdDay === todayDay) {
        result.push({
          childName: child.first_name,
          groupId: child.group_id,
          parentName: child.profiles?.full_name || "Unbekannt",
        });
      }
    });

    return result;
  } catch (err) {
    console.error("Geburtstage laden fehlgeschlagen:", err);
    return [];
  }
}

export async function hasTodayBirthdaysForUser(user) {
  const birthdays = await getTodayBirthdaysForUser(user);
  return birthdays.length > 0;
}