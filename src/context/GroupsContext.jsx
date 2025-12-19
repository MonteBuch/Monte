// src/context/GroupsContext.jsx
// Zentraler Context für Gruppen-Daten mit Realtime-Subscriptions

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient";
import { FACILITY_ID } from "../lib/constants";

const GroupsContext = createContext(null);

export function GroupsProvider({ children }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Gruppen laden und sortieren
  const loadGroups = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("groups")
        .select("*")
        .eq("facility_id", FACILITY_ID)
        .order("position", { ascending: true });

      if (fetchError) throw fetchError;

      // Eventgruppe immer an erste Stelle
      const sorted = [...(data || [])].sort((a, b) => {
        if (a.is_event_group) return -1;
        if (b.is_event_group) return 1;
        return (a.position ?? 999) - (b.position ?? 999);
      });

      setGroups(sorted);
      setError(null);
    } catch (e) {
      console.error("Fehler beim Laden der Gruppen:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial laden + Realtime Subscription
  useEffect(() => {
    loadGroups();

    // Realtime Subscription für Gruppen-Änderungen
    const channel = supabase
      .channel("groups-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "groups",
          filter: `facility_id=eq.${FACILITY_ID}`,
        },
        (payload) => {
          console.log("Groups Realtime Update:", payload.eventType);

          if (payload.eventType === "INSERT") {
            setGroups((prev) => {
              const newGroup = payload.new;
              // Sortierung beibehalten
              const updated = [...prev, newGroup].sort((a, b) => {
                if (a.is_event_group) return -1;
                if (b.is_event_group) return 1;
                return (a.position ?? 999) - (b.position ?? 999);
              });
              return updated;
            });
          } else if (payload.eventType === "UPDATE") {
            setGroups((prev) =>
              prev
                .map((g) => (g.id === payload.new.id ? payload.new : g))
                .sort((a, b) => {
                  if (a.is_event_group) return -1;
                  if (b.is_event_group) return 1;
                  return (a.position ?? 999) - (b.position ?? 999);
                })
            );
          } else if (payload.eventType === "DELETE") {
            setGroups((prev) => prev.filter((g) => g.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const value = {
    groups,
    loading,
    error,
    reload: loadGroups,
  };

  return (
    <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>
  );
}

export function useGroups() {
  const context = useContext(GroupsContext);
  if (!context) {
    throw new Error("useGroups must be used within a GroupsProvider");
  }
  return context;
}
