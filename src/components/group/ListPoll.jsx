// src/components/group/ListPoll.jsx
import React from "react";
import { supabase } from "../../api/supabaseClient"; // ⬅️ NEU
import { StorageService } from "../../lib/storage";

/**
 * Polls (Abstimmungen)
 * - Single Choice
 * - Eltern können abstimmen, Team nicht
 * - erneuter Klick = Stimme entfernen
 * - Grid-Layout bei vielen Optionen
 */
export default function ListPoll({ list, user, isAdmin, reload }) {
  const items = Array.isArray(list.items) ? list.items : [];

  // ────────────────────────────────────────────────
  //   Supabase-Speichern der aktualisierten Items
  // ────────────────────────────────────────────────
  const saveToSupabase = async (newItems) => {
    const { error } = await supabase
      .from("group_lists")
      .update({ items: newItems })
      .eq("id", list.id);

    if (error) {
      console.error("Fehler beim Speichern der Poll-Daten:", error);
      alert("Fehler beim Speichern.");
      return;
    }

    reload();
  };

  // ────────────────────────────────────────────────
  //   VOTE TOGGLEN
  // ────────────────────────────────────────────────
  const toggleVote = async (itemIndex) => {
    if (isAdmin) return;

    const me = user.username;
    const newItems = items.map((item, idx) => {
      const votes = Array.isArray(item.votes) ? [...item.votes] : [];

      // Entferne meine Stimme aus allen Optionen
      const filteredVotes = votes.filter((v) => v !== me);

      // Zieloption → ggf. Stimme setzen
      if (idx === itemIndex) {
        const hadVote = votes.includes(me);

        if (!hadVote) {
          filteredVotes.push(me);
        }
      }

      return {
        ...item,
        votes: filteredVotes,
      };
    });

    await saveToSupabase(newItems);
  };

  if (items.length === 0) {
    return (
      <p className="text-xs text-stone-400">Noch keine Abstimmungsoptionen.</p>
    );
  }

  return (
    <div
      className={`grid gap-2 ${
        items.length <= 2
          ? "grid-cols-1"
          : items.length === 3
          ? "grid-cols-2"
          : "grid-cols-2"
      }`}
    >
      {items.map((item, idx) => {
        const votes = Array.isArray(item.votes) ? item.votes : [];
        const hasMyVote = votes.includes(user.username);

        const voteText =
          votes.length === 0
            ? "Keine Stimmen"
            : votes.length === 1
            ? "1 Stimme"
            : `${votes.length} Stimmen`;

        const baseClasses =
          "w-full flex flex-col items-center justify-center px-4 py-4 rounded-2xl border text-sm font-bold transition text-center";

        // ADMIN / TEAM (read only)
        if (isAdmin) {
          return (
            <div
              key={idx}
              className={`${baseClasses} bg-stone-50 border-stone-200 text-stone-700`}
            >
              <span>{item.label}</span>
              <span className="text-[10px] text-stone-500 mt-1">{voteText}</span>
            </div>
          );
        }

        // ELTERN (klickbare Poll Options)
        return (
          <button
            key={idx}
            onClick={() => toggleVote(idx)}
            className={
              hasMyVote
                ? `${baseClasses} bg-amber-500 border-amber-600 text-white`
                : `${baseClasses} bg-stone-50 border-stone-200 text-stone-700 hover:bg-amber-100`
            }
          >
            <span>{item.label}</span>
            <span className="text-[10px] text-stone-700 mt-1">{voteText}</span>
          </button>
        );
      })}
    </div>
  );
}