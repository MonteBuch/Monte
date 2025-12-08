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

  const realChildren = Array.isArray(user.children) ? user.children : [];

  const facility = StorageService.getFacilitySettings();
  const groups = facility?.groups || [];

  // ✅ ALLE LISTEN GLOBAL LADEN (für Event-Sichtbarkeit)
  const allLists = useMemo(() => {
    return StorageService.get("grouplists") || [];
  }, []);

  // ✅ Gibt es mindestens eine aktive Event-Liste?
  const hasActiveEventLists = useMemo(() => {
    return allLists.some((l) => l.groupId === "event");
  }, [allLists]);

  // ✅ VIRTUELLES EVENT-KIND FÜR GROUPCHIPS
  // ✅ UND: Event IMMER AUF POSITION 1
  const children = useMemo(() => {
    if (isStaff) return realChildren;

    let base = [...realChildren];

    if (hasActiveEventLists) {
      base = [
        {
          id: "__event__",
          name: "Event",
          group: "event",
        },
        ...base, // ✅ Event immer vorne
      ];
    }

    return base;
  }, [realChildren, hasActiveEventLists, isStaff]);

  // aktive Gruppe
  const [activeGroup, setActiveGroup] = useState(() => {
    if (isStaff) {
      return user.primaryGroup || groups[0]?.id;
    }

    // ✅ Wenn Event sichtbar ist → automatisch vorausgewählt
    if (hasActiveEventLists) {
      return "event";
    }

    if (realChildren.length > 0) {
      return realChildren[0].group;
    }

    return groups[0]?.id;
  });

  const [lists, setLists] = useState([]);

  const visibleGroupIds = isStaff
    ? groups.map((g) => g.id)
    : [...new Set(children.map((c) => c.group))];

  const childrenView = !isStaff && children.length > 1;

  useEffect(() => {
    if (!isStaff && hasActiveEventLists) {
      setActiveGroup("event"); // ✅ Event bleibt aktiv
    } else if (!isStaff && realChildren.length > 0) {
      setActiveGroup(realChildren[0].group);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveEventLists]);

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

  // ✅ Robuster Gruppen-Finder
  const currentGroupRaw = useMemo(() => {
    let grp = getGroupById(groups, activeGroup);
    if (grp) return grp;

    grp = groups.find((g) => g.name === activeGroup);
    if (grp) return grp;

    const child = children.find(
      (c) => c.group === activeGroup || c.name === activeGroup
    );

    if (child) {
      const byId = getGroupById(groups, child.group);
      if (byId) return byId;

      const byName = groups.find((g) => g.name === child.group);
      if (byName) return byName;
    }

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
        className="p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col gap-3"
        style={{ backgroundColor: currentGroup.headerColor }}
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