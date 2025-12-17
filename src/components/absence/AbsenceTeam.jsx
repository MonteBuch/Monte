// src/components/absence/AbsenceTeam.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Eye, EyeOff, Trash2, CalendarDays, Loader2 } from "lucide-react";
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
    year: sameMonth ? undefined : "numeric",
  });

  const toLabel = toDate.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${fromLabel} – ${toLabel}`;
}

function formatReason(reason) {
  switch (reason) {
    case "krankheit":
      return { label: "Krankheit", className: "bg-amber-100 text-amber-900" };
    case "urlaub":
      return { label: "Urlaub", className: "bg-emerald-100 text-emerald-900" };
    case "termin":
      return { label: "Termin", className: "bg-sky-100 text-sky-900" };
    case "sonstiges":
      return { label: "Sonstiges", className: "bg-stone-200 text-stone-800" };
    default:
      return { label: reason, className: "bg-stone-100 text-stone-800" };
  }
}

export default function AbsenceTeam({ user }) {
  const [allEntries, setAllEntries] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = user.role === "admin";

  const [selectedGroup, setSelectedGroup] = useState(
    isAdmin ? "all" : user.primaryGroup || "all"
  );

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

  // Absences + Read-Status laden
  const loadAbsences = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Absences für die Facility laden
      const { data: absences, error: absError } = await supabase
        .from("absences")
        .select("*")
        .eq("facility_id", FACILITY_ID)
        .order("created_at", { ascending: false });

      if (absError) throw absError;

      // Read-Status für den User laden
      const { data: statusData, error: statusError } = await supabase
        .from("absence_read_status")
        .select("*")
        .eq("user_id", user.id);

      if (statusError) throw statusError;

      // Status-Map aufbauen
      const newStatusMap = {};
      (statusData || []).forEach((s) => {
        newStatusMap[s.absence_id] = {
          status: s.status || "new",
          hidden: s.hidden || false,
        };
      });

      // Absences formatieren
      const formatted = (absences || []).map((a) => ({
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

      // Auto-Hide: gelesene + vergangene Meldungen ausblenden
      const todayIso = new Date().toISOString().slice(0, 10);
      const toHide = [];

      formatted.forEach((e) => {
        const meta = newStatusMap[e.id] || { status: "new", hidden: false };
        if (!meta.hidden && meta.status === "read") {
          const endIso = e.type === "range" ? e.dateTo || e.dateFrom : e.dateFrom;
          if (endIso && endIso < todayIso) {
            toHide.push(e.id);
            meta.hidden = true;
          }
        }
        newStatusMap[e.id] = meta;
      });

      // Auto-hide in DB speichern
      if (toHide.length > 0) {
        for (const absenceId of toHide) {
          await supabase
            .from("absence_read_status")
            .upsert({
              absence_id: absenceId,
              user_id: user.id,
              hidden: true,
              updated_at: new Date().toISOString(),
            }, { onConflict: "absence_id,user_id" });
        }
      }

      setAllEntries(formatted);
      setStatusMap(newStatusMap);
    } catch (err) {
      console.error("Absences laden fehlgeschlagen:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAbsences();
  }, [loadAbsences]);

  useEffect(() => {
    setSelectedGroup(isAdmin ? "all" : user.primaryGroup || "all");
  }, [isAdmin, user.primaryGroup]);

  const effectiveStatus = (entry) => {
    const meta = statusMap[entry.id];
    return meta?.status || "new";
  };

  const isHiddenForUser = (entry) => {
    const meta = statusMap[entry.id];
    return meta?.hidden === true;
  };

  const dateLabel = (e) =>
    e.type === "single"
      ? formatDate(e.dateFrom)
      : formatDateRange(e.dateFrom, e.dateTo);

  const setStatus = async (entry, newStatus) => {
    try {
      await supabase
        .from("absence_read_status")
        .upsert({
          absence_id: entry.id,
          user_id: user.id,
          status: newStatus,
          updated_at: new Date().toISOString(),
        }, { onConflict: "absence_id,user_id" });

      setStatusMap((prev) => ({
        ...prev,
        [entry.id]: { ...prev[entry.id], status: newStatus },
      }));
    } catch (err) {
      console.error("Status speichern fehlgeschlagen:", err);
    }
  };

  const hideForUser = async (entry) => {
    if (!confirm("Meldung für dieses Profil ausblenden?")) return;

    try {
      await supabase
        .from("absence_read_status")
        .upsert({
          absence_id: entry.id,
          user_id: user.id,
          hidden: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "absence_id,user_id" });

      setStatusMap((prev) => ({
        ...prev,
        [entry.id]: { ...prev[entry.id], hidden: true },
      }));
    } catch (err) {
      console.error("Ausblenden fehlgeschlagen:", err);
    }
  };

  // Filter: keine Event-Gruppen
  const displayGroups = groups.filter((g) => !g.is_event_group);

  // Event-Gruppen-IDs ermitteln
  const eventGroupIds = groups.filter((g) => g.is_event_group).map((g) => g.id);

  const visibleEntries = allEntries
    .filter((e) => !isHiddenForUser(e))
    .filter((e) => {
      if (selectedGroup === "all") return true;
      return e.groupId === selectedGroup;
    })
    .filter((e) => !eventGroupIds.includes(e.groupId)) // Event-Meldungen raus
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const newEntries = visibleEntries.filter(
    (e) => effectiveStatus(e) === "new"
  );
  const readEntries = visibleEntries.filter(
    (e) => effectiveStatus(e) === "read"
  );

  const unreadCountByGroup = allEntries.reduce((acc, e) => {
    if (isHiddenForUser(e)) return acc;
    if (effectiveStatus(e) !== "new") return acc;
    if (eventGroupIds.includes(e.groupId)) return acc;
    const gid = e.groupId || "unknown";
    acc[gid] = (acc[gid] || 0) + 1;
    return acc;
  }, {});

  const totalUnread = Object.values(unreadCountByGroup).reduce(
    (sum, n) => sum + n,
    0
  );

  const renderEntryCard = (entry, faded) => {
    const groupRaw = getGroupById(displayGroups, entry.groupId);
    const groupStyles = getGroupStyles(groupRaw);
    const reason = formatReason(entry.reason);

    return (
      <div
        key={entry.id}
        className={`p-4 rounded-2xl border shadow-sm space-y-3 ${
          faded ? "bg-stone-50 text-stone-500" : "bg-white text-stone-800"
        }`}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-1.5">
            <p className="font-semibold text-sm">{entry.childName}</p>

            <p className="text-xs text-stone-600 flex items-center gap-1">
              <CalendarDays size={12} className="text-stone-400" />
              <span>{dateLabel(entry)}</span>
            </p>

            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${reason.className}`}
            >
              {reason.label}
            </span>

            {entry.reason === "sonstiges" && entry.otherText && (
              <p className="text-xs text-stone-600">{entry.otherText}</p>
            )}
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
              {effectiveStatus(entry) === "new" ? (
                <button
                  onClick={() => setStatus(entry, "read")}
                  className="p-2 bg-stone-100 rounded-lg hover:bg-stone-200"
                >
                  <Eye size={14} />
                </button>
              ) : (
                <button
                  onClick={() => setStatus(entry, "new")}
                  className="p-2 bg-stone-100 rounded-lg hover:bg-stone-200"
                >
                  <EyeOff size={14} />
                </button>
              )}

              <button
                onClick={() => hideForUser(entry)}
                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-stone-400">
          Eingereicht am{" "}
          {new Date(entry.createdAt).toLocaleString("de-DE")}
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex justify-center">
        <Loader2 className="animate-spin text-amber-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedGroup("all")}
          className={`px-3 py-1 rounded-full text-xs font-bold border transition flex items-center gap-1 ${
            selectedGroup === "all"
              ? "bg-stone-800 text-white border-stone-900"
              : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
          }`}
        >
          <span>Alle</span>
          {totalUnread > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-[10px] text-stone-900">
              {totalUnread}
            </span>
          )}
        </button>

        {displayGroups.map((g) => {
          const groupStyles = getGroupStyles(g);
          const unread = unreadCountByGroup[g.id] || 0;
          const active = selectedGroup === g.id;

          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedGroup(g.id)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border transition ${
                active
                  ? `${groupStyles.chipClass} border-transparent text-white`
                  : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
              }`}
            >
              <groupStyles.Icon size={14} />
              <span>{groupStyles.name}</span>
              {unread > 0 && (
                <span
                  className={`ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] ${
                    active
                      ? "bg-white/90 text-stone-900"
                      : "bg-amber-400 text-stone-900"
                  }`}
                >
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          Neue Meldungen
        </h2>
        {newEntries.length === 0 ? (
          <div className="bg-white p-4 rounded-2xl border border-dashed border-stone-200 text-xs text-stone-400">
            Keine neuen Meldungen.
          </div>
        ) : (
          newEntries.map((e) => renderEntryCard(e, false))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          Gelesene Meldungen
        </h2>
        {readEntries.length === 0 ? (
          <div className="bg-white p-4 rounded-2xl border border-dashed border-stone-200 text-xs text-stone-400">
            Keine gelesenen Meldungen.
          </div>
        ) : (
          readEntries.map((e) => renderEntryCard(e, true))
        )}
      </section>
    </div>
  );
}