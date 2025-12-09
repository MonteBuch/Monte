import React, { useEffect, useState, useMemo } from "react";
import { StorageService } from "../../lib/storage";
import { getGroupById, getGroupStyles } from "../../utils/groupUtils";
import { CheckCircle, Undo2, Trash2, CalendarDays } from "lucide-react";

const REASON_STYLES = {
  krankheit: "bg-amber-100 text-amber-900",
  termin: "bg-emerald-100 text-emerald-900",
  urlaub: "bg-sky-100 text-sky-900",
  sonstiges: "bg-stone-200 text-stone-800",
};

export default function AdminAbsenceDashboard({ user }) {
  const facility = StorageService.getFacilitySettings();
  const groups = (facility?.groups || []).filter((g) => g.id !== "event");

  const [groupId, setGroupId] = useState(user.primaryGroup || groups[0]?.id);
  const [activeTab, setActiveTab] = useState("new");
  const [entries, setEntries] = useState([]);

  const load = () => {
    const all = StorageService.get("absences") || [];
    const filtered = all.filter((e) => e.groupId === groupId);
    setEntries(filtered);
  };

  useEffect(() => {
    if (groupId) load();
  }, [groupId]);

  const markRead = (id) => {
    const all = StorageService.get("absences") || [];
    const idx = all.findIndex((e) => e.id === id);
    if (idx === -1) return;
    all[idx].status = "read";
    StorageService.set("absences", all);
    load();
  };

  const markUnread = (id) => {
    const all = StorageService.get("absences") || [];
    const idx = all.findIndex((e) => e.id === id);
    if (idx === -1) return;
    all[idx].status = "new";
    StorageService.set("absences", all);
    load();
  };

  const remove = (id) => {
    if (!confirm("Meldung löschen?")) return;
    const all = StorageService.get("absences") || [];
    const filtered = all.filter((e) => e.id !== id);
    StorageService.set("absences", filtered);
    load();
  };

  const newEntries = entries
    .filter((e) => e.status === "new")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const readEntries = entries
    .filter((e) => e.status === "read")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const currentGroupRaw = useMemo(
    () => getGroupById(groups, groupId),
    [groups, groupId]
  );

  const currentGroup = useMemo(
    () => getGroupStyles(currentGroupRaw),
    [currentGroupRaw]
  );

  const unreadCountByGroup = useMemo(() => {
    const all = StorageService.get("absences") || [];
    return all.reduce((acc, e) => {
      if (e.groupId === "event") return acc;
      if (e.status !== "new") return acc;
      acc[e.groupId] = (acc[e.groupId] || 0) + 1;
      return acc;
    }, {});
  }, [entries]);

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("de-DE");
  }

  const dateLabel = (e) => {
    if (e.type === "single") return formatDate(e.dateFrom);
    return `${formatDate(e.dateFrom)} – ${formatDate(e.dateTo)}`;
  };

  const renderCard = (e, faded = false) => {
    const reasonStyle = REASON_STYLES[e.reason] || REASON_STYLES.sonstiges;

    return (
      <div
        key={e.id}
        className={`p-4 rounded-2xl border shadow-sm ${
          faded
            ? "bg-stone-50 border-stone-200 opacity-70"
            : "bg-white border-amber-200"
        }`}
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 space-y-1">
            <p className="font-bold text-sm text-stone-800">{e.childName}</p>

            <p className="text-xs text-stone-600 flex items-center gap-1">
              <CalendarDays size={12} className="text-stone-400" />
              {dateLabel(e)}
            </p>

            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${reasonStyle}`}
            >
              {e.reason === "sonstiges"
                ? e.otherText || "Sonstiges"
                : e.reason.charAt(0).toUpperCase() + e.reason.slice(1)}
            </span>

            <p className="text-[10px] text-stone-400 mt-1">
              Eingereicht am{" "}
              {new Date(e.createdAt).toLocaleString("de-DE")}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              {e.status === "new" ? (
                <button
                  onClick={() => markRead(e.id)}
                  className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                >
                  <CheckCircle size={16} />
                </button>
              ) : (
                <button
                  onClick={() => markUnread(e.id)}
                  className="p-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300"
                >
                  <Undo2 size={16} />
                </button>
              )}

              <button
                onClick={() => remove(e.id)}
                className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ✅ NUR DER HEADER (KEIN EXTRA „ABWESENHEITEN“) */}
      <div
        className="p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col gap-3"
        style={{ backgroundColor: currentGroup?.headerColor }}
      >
        <div className="flex items-center gap-3">
          <div
            className={`${currentGroup?.chipClass} p-2 rounded-2xl text-white shadow`}
          >
            {currentGroup && <currentGroup.Icon size={20} />}
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-800">Meldungen</h2>
            <p className="text-xs text-stone-600">
              Abwesenheiten der Gruppe {currentGroup?.name}
            </p>
          </div>
        </div>

        {/* ✅ CHIP-LEISTE MIT BADGES (NICHT MEHR ABGESCHNITTEN) */}
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {groups.map((g) => {
            const styles = getGroupStyles(g);
            const active = g.id === groupId;
            const unread = unreadCountByGroup[g.id] || 0;

            return (
              <button
                key={g.id}
                onClick={() => setGroupId(g.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-bold whitespace-nowrap transition ${
                  active
                    ? `${styles.chipClass} border-transparent text-white`
                    : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
                }`}
              >
                <styles.Icon size={14} />
                <span>{styles.name}</span>

                {unread > 0 && (
                  <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-[10px] font-bold flex items-center justify-center text-stone-900">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB SELECTOR */}
      <div className="flex gap-3">
        <button
          className={`flex-1 py-2 rounded-xl text-sm font-bold border transition ${
            activeTab === "new"
              ? "bg-amber-500 text-white border-transparent"
              : "bg-white border-stone-300 text-stone-600 hover:bg-stone-100"
          }`}
          onClick={() => setActiveTab("new")}
        >
          Neu ({newEntries.length})
        </button>

        <button
          className={`flex-1 py-2 rounded-xl text-sm font-bold border transition ${
            activeTab === "read"
              ? "bg-amber-500 text-white border-transparent"
              : "bg-white border-stone-300 text-stone-600 hover:bg-stone-100"
          }`}
          onClick={() => setActiveTab("read")}
        >
          Gelesen ({readEntries.length})
        </button>
      </div>

      {/* INHALT */}
      {activeTab === "new" && (
        <div className="space-y-3">
          {newEntries.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border text-center text-stone-500">
              Keine neuen Meldungen.
            </div>
          ) : (
            newEntries.map((e) => renderCard(e, false))
          )}
        </div>
      )}

      {activeTab === "read" && (
        <div className="space-y-3">
          {readEntries.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border text-center text-stone-500">
              Keine gelesenen Meldungen.
            </div>
          ) : (
            readEntries.map((e) => renderCard(e, true))
          )}
        </div>
      )}
    </div>
  );
}