import React, { useState, useEffect } from "react";
import { Trash2, Pencil, Loader2 } from "lucide-react";
import AbsenceBanner from "./AbsenceBanner";
import AbsenceEditor from "./AbsenceEditor";
import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";
import { getGroupById, getGroupStyles } from "../../utils/groupUtils";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateRange(from, to) {
  if (!from && !to) return "";
  if (!to || from === to) return formatDate(from);

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return `${from} – ${to}`;
  }

  const sameYear = fromDate.getFullYear() === toDate.getFullYear();
  const sameMonth = sameYear && fromDate.getMonth() === toDate.getMonth();

  const fromLabel = fromDate.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: sameYear && sameMonth ? undefined : "numeric",
  });

  const toLabel = toDate.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${fromLabel} – ${toLabel}`;
}

function getReasonMeta(reason) {
  switch (reason) {
    case "krankheit":
      return { label: "Krankheit", className: "bg-amber-100 text-amber-900" };
    case "urlaub":
      return { label: "Urlaub", className: "bg-emerald-100 text-emerald-900" };
    case "termin":
      return { label: "Termin", className: "bg-sky-100 text-sky-900" };
    case "sonstiges":
      return { label: "Sonstiges", className: "bg-stone-100 text-stone-800" };
    default:
      return { label: reason, className: "bg-stone-100 text-stone-800" };
  }
}

export default function AbsenceReport({ user }) {
  const children = Array.isArray(user.children) ? user.children : [];

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChildId, setActiveChildId] = useState(
    children.length > 0 ? children[0].id : null
  );
  const [editing, setEditing] = useState(null);
  const [entries, setEntries] = useState([]);

  // Gruppen laden
  useEffect(() => {
    async function loadGroups() {
      try {
        const { data } = await supabase
          .from("groups")
          .select("*")
          .eq("facility_id", FACILITY_ID)
          .order("position");
        setGroups(data || []);
      } catch (err) {
        console.error("Gruppen laden fehlgeschlagen:", err);
      }
    }
    loadGroups();
  }, []);

  // Absences für aktives Kind laden
  useEffect(() => {
    if (activeChildId) {
      loadAbsences();
    }
  }, [activeChildId]);

  const loadAbsences = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("absences")
        .select("*")
        .eq("child_id", activeChildId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Format für Kompatibilität
      const formatted = (data || []).map(a => ({
        id: a.id,
        childId: a.child_id,
        childName: a.child_name,
        groupId: a.group_id,
        type: a.type,
        dateFrom: a.date_from,
        dateTo: a.date_to,
        reason: a.reason,
        otherText: a.other_text,
        status: a.status,
        createdAt: a.created_at,
      }));

      setEntries(formatted);
    } catch (err) {
      console.error("Absences laden fehlgeschlagen:", err);
    } finally {
      setLoading(false);
    }
  };

  const save = async (entry) => {
    try {
      const dbEntry = {
        facility_id: FACILITY_ID,
        child_id: entry.childId,
        child_name: entry.childName,
        group_id: entry.groupId,
        type: entry.type,
        date_from: entry.dateFrom,
        date_to: entry.dateTo,
        reason: entry.reason,
        other_text: entry.otherText || null,
        status: entry.status || "new",
        created_by: user.id,
      };

      // Prüfen ob Update oder Insert
      const existingIdx = entries.findIndex(e => e.id === entry.id);

      if (existingIdx === -1) {
        // Insert
        const { error } = await supabase
          .from("absences")
          .insert(dbEntry);

        if (error) throw error;
      } else {
        // Update
        const { error } = await supabase
          .from("absences")
          .update({
            ...dbEntry,
            updated_at: new Date().toISOString(),
          })
          .eq("id", entry.id);

        if (error) throw error;
      }

      setEditing(null);
      loadAbsences();
    } catch (err) {
      console.error("Speichern fehlgeschlagen:", err);
      alert("Fehler beim Speichern: " + err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm("Meldung löschen?")) return;

    try {
      const { error } = await supabase
        .from("absences")
        .delete()
        .eq("id", id);

      if (error) throw error;
      loadAbsences();
    } catch (err) {
      console.error("Löschen fehlgeschlagen:", err);
      alert("Fehler beim Löschen: " + err.message);
    }
  };

  const child = children.find((c) => c.id === activeChildId) || children[0] || null;

  const dateLabel = (e) => {
    if (e.type === "single") return formatDate(e.dateFrom);
    return formatDateRange(e.dateFrom, e.dateTo);
  };

  if (!child) {
    return (
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 text-sm text-stone-600">
        Für dieses Profil sind aktuell keine Kinder hinterlegt.
      </div>
    );
  }

  const displayGroups = groups.filter(g => !g.is_event_group);

  return (
    <div className="space-y-5">
      <AbsenceBanner />

      {/* CHIP-Auswahl der Kinder */}
      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map((c) => {
            const groupStyles = getGroupStyles(
              getGroupById(displayGroups, c.group)
            );
            const active = c.id === activeChildId;

            return (
              <button
                key={c.id}
                onClick={() => {
                  setActiveChildId(c.id);
                  setEditing(null);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-bold transition whitespace-nowrap ${
                  active
                    ? `${groupStyles.chipClass} border-transparent text-white`
                    : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
                }`}
              >
                <groupStyles.Icon size={14} />
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Editor */}
      {child && (
        <AbsenceEditor
          mode={editing ? "edit" : "create"}
          initialData={editing}
          child={child}
          groups={displayGroups}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Liste */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex justify-center">
            <Loader2 className="animate-spin text-amber-500" size={24} />
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 text-center text-stone-500 text-sm">
            Keine bisherigen Meldungen.
          </div>
        ) : (
          entries.map((e) => {
            const groupStyles = getGroupStyles(
              getGroupById(displayGroups, e.groupId)
            );
            const reasonMeta = getReasonMeta(e.reason);
            const submittedAt = new Date(e.createdAt).toLocaleString("de-DE");

            return (
              <div
                key={e.id}
                className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">
                        {e.childName || child.name}
                      </p>
                      <p className="text-xs text-stone-600 mt-0.5">
                        {dateLabel(e)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${reasonMeta.className}`}
                      >
                        {reasonMeta.label}
                      </span>
                      {e.reason === "sonstiges" && e.otherText && (
                        <span className="text-xs text-stone-600">
                          {e.otherText}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {groupStyles && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white ${groupStyles.chipClass}`}
                      >
                        <groupStyles.Icon size={12} />
                        <span>{groupStyles.name}</span>
                      </span>
                    )}

                    <div className="flex gap-1 mt-1">
                      <button
                        type="button"
                        onClick={() => setEditing(e)}
                        className="p-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(e.id)}
                        className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-stone-400 mt-2">
                  Eingereicht am {submittedAt}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
