// src/components/group/ListItems.jsx
import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "../../api/supabaseClient"; // ⬅️ NEU
import { StorageService } from "../../lib/storage";   // bleibt für Namenslogik

/**
 * ListItems:
 * - bring / duty
 * - Eltern: übernehmen, abgeben, hinzufügen, eigene löschen
 * - Admin: reine Anzeige
 * - Supabase WRITE
 */
export default function ListItems({
  list,
  user,
  group,
  isAdmin,
  reload,
}) {
  const [newItem, setNewItem] = useState("");

  // Nur für Anzeigezwecke weiter genutzt:
  const allUsers = StorageService.get("users") || [];

  const getChildNameForUserInGroup = (username, groupId) => {
    const u = allUsers.find((x) => x.username === username);
    if (!u || !Array.isArray(u.children)) return username;

    const child =
      u.children.find((c) => c.group === groupId) || u.children[0];

    return child?.name || username;
  };

  // ────────────────────────────────────────────────
  //  Supabase: gesamte Items-Liste aktualisieren
  // ────────────────────────────────────────────────
  const updateItems = async (newItems) => {
    const { error } = await supabase
      .from("group_lists")
      .update({ items: newItems })
      .eq("id", list.id);

    if (error) {
      console.error("Fehler beim Aktualisieren der Items:", error);
      alert("Fehler beim Speichern.");
      return;
    }

    reload();
  };

  // ────────────────────────────────────────────────
  //  ÜBERNEHMEN / ABGEBEN
  // ────────────────────────────────────────────────
  const toggleAssign = async (itemIndex) => {
    if (isAdmin) return;

    const items = [...list.items];
    const item = { ...items[itemIndex] };
    const me = user.username;

    item.assignedTo = item.assignedTo === me ? null : me;

    items[itemIndex] = item;

    await updateItems(items);
  };

  // ────────────────────────────────────────────────
  //  NEUES ITEM
  // ────────────────────────────────────────────────
  const addCustomItem = async () => {
    if (isAdmin) return;
    if (!newItem.trim()) return;

    const items = [...list.items];

    items.push({
      label: newItem.trim(),
      assignedTo: user.username, // automatisch übernommen
      createdBy: user.username,
    });

    setNewItem("");
    await updateItems(items);
  };

  // ────────────────────────────────────────────────
  //  ITEM LÖSCHEN (nur eigene)
  // ────────────────────────────────────────────────
  const deleteItem = async (itemIndex) => {
    const item = list.items[itemIndex];

    if (item.createdBy !== user.username) return;

    const items = [...list.items];
    items.splice(itemIndex, 1);

    await updateItems(items);
  };

  // ────────────────────────────────────────────────
  //  RENDER
  // ────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {/* ITEMS */}
      {list.items?.length > 0 ? (
        list.items.map((item, idx) => {
          const assigned = item.assignedTo;
          const isMine = assigned === user.username;

          const assignedName = assigned
            ? isMine
              ? "Du"
              : getChildNameForUserInGroup(assigned, group.id)
            : isAdmin
            ? "—"
            : "Übernehmen";

          return (
            <div
              key={idx}
              className={`flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition ${
                assigned
                  ? isMine
                    ? "bg-amber-100 border-amber-200 text-amber-900"
                    : "bg-stone-50 border-stone-200 text-stone-600"
                  : "bg-stone-50 border-stone-200 text-stone-700"
              }`}
            >
              {/* LABEL */}
              <span className="flex-1">{item.label}</span>

              {/* RECHTE SEITE */}
<div className="flex items-center gap-2 text-[10px] text-stone-500">
  {/* Textanzeige: Du / Name des Kindes / nichts bei freien Einträgen */}
  {assigned && (
    <span>{assignedName}</span>
  )}

  {/* Eltern – übernehmen (frei) oder abgeben (eigener Eintrag) */}
  {!isAdmin && (!assigned || assigned === user.username) && (
    <button
      onClick={() => toggleAssign(idx)}
      className="px-2 py-0.5 bg-white border border-stone-200 rounded-lg hover:bg-stone-100 text-[10px] font-bold"
    >
      {assigned === user.username ? "Abgeben" : "Übernehmen"}
    </button>
  )}

  {/* Eltern – eigene Items löschen */}
  {!isAdmin && item.createdBy === user.username && (
    <button
      onClick={() => deleteItem(idx)}
      className="p-1 bg-red-50 text-red-500 rounded hover:bg-red-100"
    >
      <Trash2 size={12} />
    </button>
  )}
</div>
            </div>
          );
        })
      ) : (
        <p className="text-xs text-stone-400 py-1">Noch keine Einträge.</p>
      )}

      {/* NEUES ITEM (nur Eltern) */}
      {!isAdmin && (
        <div className="flex items-center gap-2 mt-2">
          <input
            className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm"
            placeholder="Eintrag hinzufügen…"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />

          <button
            onClick={addCustomItem}
            className="p-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600"
          >
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}