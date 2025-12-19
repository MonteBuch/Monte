// src/components/group/ListItems.jsx
import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "../../api/supabaseClient";

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

  // Username-Anzeige: zeigt den assignedName wenn vorhanden, sonst Username
  const getDisplayName = (username, assignedName) => {
    // Wenn ein Name gespeichert wurde, diesen anzeigen
    if (assignedName) return assignedName;
    // Sonst Username als Fallback
    return username;
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
    const myId = user.id;

    // Kindername des aktuellen Users ermitteln
    const myChildName = Array.isArray(user.children) && user.children.length > 0
      ? user.children[0]?.name
      : user.name;

    if (item.assignedTo === myId) {
      // Abgeben
      item.assignedTo = null;
      item.assignedName = null;
    } else {
      // Übernehmen
      item.assignedTo = myId;
      item.assignedName = myChildName;
    }

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

    // Kindername für Anzeige
    const myChildName = Array.isArray(user.children) && user.children.length > 0
      ? user.children[0]?.name
      : user.name;

    items.push({
      label: newItem.trim(),
      assignedTo: user.id, // automatisch übernommen
      assignedName: myChildName,
      createdBy: user.id,
    });

    setNewItem("");
    await updateItems(items);
  };

  // ────────────────────────────────────────────────
  //  ITEM LÖSCHEN (nur eigene)
  // ────────────────────────────────────────────────
  const deleteItem = async (itemIndex) => {
    const item = list.items[itemIndex];

    if (item.createdBy !== user.id) return;

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
          const isMine = assigned === user.id;

          const displayName = assigned
            ? isMine
              ? "Du"
              : getDisplayName(assigned, item.assignedName)
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
    <span>{displayName}</span>
  )}

  {/* Eltern – übernehmen (frei) oder abgeben (eigener Eintrag) */}
  {!isAdmin && (!assigned || assigned === user.id) && (
    <button
      onClick={() => toggleAssign(idx)}
      className="px-2 py-0.5 bg-white border border-stone-200 rounded-lg hover:bg-stone-100 text-[10px] font-bold"
    >
      {assigned === user.id ? "Abgeben" : "Übernehmen"}
    </button>
  )}

  {/* Eltern – eigene Items löschen */}
  {!isAdmin && item.createdBy === user.id && (
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