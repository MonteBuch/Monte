import React, { useEffect, useState, useMemo } from "react";
import { StorageService } from "../../lib/storage";
import { getGroupById, getGroupStyles } from "../../utils/groupUtils";

import GroupChips from "./GroupChips";
import ListCard from "./ListCard";
import CreateList from "./CreateList";

export default function GroupArea({ user }) {
  const role = user?.role || "parent";
  const isStaff = role === "team" || role === "admin";
  const isAdminView = isStaff;

  const children = Array.isArray(user.children) ? user.children : [];

  const facility = StorageService.getFacilitySettings();
  const groups = facility?.groups || [];

  // aktive Gruppe
  const [activeGroup, setActiveGroup] = useState(() => {
    if (isStaff) {
      return user.primaryGroup || groups[0]?.id;
    }
    if (children.length > 0) {
      return children[0].group;
    }
    return groups[0]?.id;
  });

  const [lists, setLists] = useState([]);

  // Sichtbare Gruppen-IDs
  const visibleGroupIds = isStaff
    ? groups.map((g) => g.id)
    : [...new Set(children.map((c) => c.group))];

  const childrenView = !isStaff && children.length > 1;

  useEffect(() => {
    if (!isStaff && children.length > 0) {
      setActiveGroup(children[0].group);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup]);

  const loadLists = () => {
    const all = StorageService.get("grouplists") || [];
    const filtered = all.filter((l) => l.groupId === activeGroup);

    filtered.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    setLists(filtered);
  };

  // ✅ Robuster Gruppen-Finder (ID → Name → Kind → Fallback)
  const currentGroupRaw = useMemo(() => {
    // 1. Direkter ID-Match
    let grp = getGroupById(groups, activeGroup);
    if (grp) return grp;

    // 2. Name-Match (Altbestände)
    grp = groups.find((g) => g.name === activeGroup);
    if (grp) return grp;

    // 3. Kind-basierter Fallback
    const child = children.find(
      (c) => c.group === activeGroup || c.name === activeGroup
    );

    if (child) {
      const byId = getGroupById(groups, child.group);
      if (byId) return byId;

      const byName = groups.find((g) => g.name === child.group);
      if (byName) return byName;
    }

    // 4. Letzter sicherer Fallback → Wolke
    return {
      id: "fallback-cloud",
      name: "Wolke",
      color: "bg-cyan-500",
      icon: "cloud",
    };
  }, [groups, activeGroup, children]);

  const currentGroup = useMemo(
    () => getGroupStyles(currentGroupRaw),
    [currentGroupRaw]
  );

  return (
    <div className="space-y-5">
      {/* HEADER-KARTE */}
      <div
        className={`p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col gap-3 ${currentGroup.headerApproxClass}`}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              className={`${currentGroup.chipClass} p-2 rounded-2xl text-white shadow`}
            >
              <currentGroup.Icon size={20} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-stone-800">
                Gruppenbereich
              </h2>
              <p className="text-xs text-stone-600">
                {childrenView
                  ? "Übersicht zu allen Listen"
                  : `Gruppe ${currentGroup.name}`}
              </p>
            </div>
          </div>
          {/* ✅ Rechts entfernt wie gewünscht */}
        </div>

        <GroupChips
          isAdmin={isAdminView}
          activeGroup={activeGroup}
          setActiveGroup={setActiveGroup}
          children={children}
          visibleGroupIds={visibleGroupIds}
        />
      </div>

      {/* LISTEN-ÜBERSICHT */}
      <div className="space-y-3">
        {lists.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 text-center text-stone-500 text-sm">
            Für diese Gruppe sind noch keine Listen angelegt.
          </div>
        ) : (
          lists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              user={user}
              group={currentGroup}
              isAdmin={isAdminView}
              reload={loadLists}
            />
          ))
        )}
      </div>

      {isStaff && (
        <CreateList activeGroup={activeGroup} reload={loadLists} />
      )}
    </div>
  );
}