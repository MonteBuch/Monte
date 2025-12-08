// src/components/group/GroupChips.jsx
import React from "react";
import { Globe } from "lucide-react";
import { StorageService } from "../../lib/storage";
import { getGroupById, getGroupStyles } from "../../utils/groupUtils";

/**
 * GroupChips:
 *
 * - TEAM: Zeigt alle Gruppen als Chips
 * - ELTERN: Zeigt Kinder als Chips (mit Gruppe jeweils darin)
 */
export default function GroupChips({
  isAdmin,
  activeGroup,
  setActiveGroup,
  children,
  visibleGroupIds,
}) {
  const facility = StorageService.getFacilitySettings();
  const groups = facility?.groups || [];

  // ───────────────────────────────────────────────────────────────
  // TEAM-ANSICHT
  // ───────────────────────────────────────────────────────────────
  if (isAdmin) {
    const visibleGroups = groups.filter((g) =>
      visibleGroupIds?.includes(g.id)
    );

    return (
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {visibleGroups.map((g) => {
          const isActive = g.id === activeGroup;
          const styles = getGroupStyles(g);

          const color = styles.chipClass || "bg-stone-300";
          const Icon = styles.Icon || Globe;

          return (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-bold whitespace-nowrap transition ${
                isActive
                  ? `${color} border-transparent shadow-sm`
                  : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
              }`}
            >
              <Icon size={14} />
              <span>{styles.name || "Unbenannt"}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────
  // ELTERN-ANSICHT (mehrere Kinder)
  // ───────────────────────────────────────────────────────────────
  if (!isAdmin && children?.length > 1) {
    return (
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {children.map((child) => {
          const group = getGroupById(groups, child.group);
          const styles = getGroupStyles(group);

          const color = styles.chipClass || "bg-stone-300";
          const Icon = styles.Icon || Globe;
          const name = child.name || "Kind";

          const isActive = child.group === activeGroup;

          return (
            <button
              key={child.id}
              onClick={() => setActiveGroup(child.group)}
              className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-bold whitespace-nowrap transition ${
                isActive
                  ? `${color} border-transparent shadow-sm`
                  : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
              }`}
            >
              <Icon size={14} />
              <span>{name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────
  // ELTERN mit nur einem Kind → keine Chips nötig
  // ───────────────────────────────────────────────────────────────
  return null;
}