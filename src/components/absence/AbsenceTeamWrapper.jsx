// src/components/absence/AbsenceTeamWrapper.jsx

import React from "react";
import AdminAbsenceDashboard from "./AdminAbsenceDashboard";

/**
 * Wrapper für Team-Benutzer im Meldungen-Tab.
 * Zeigt dieselbe Abwesenheitsübersicht wie das Admin-Dashboard,
 * OHNE eigene zusätzliche Überschrift.
 */
export default function AbsenceTeamWrapper({ user }) {
  return (
    <div className="p-4 space-y-5">
      {/* ✅ Überschrift "Abwesenheiten" bewusst entfernt */}

      {/* Team nutzt nun die Admin-Ansicht der Meldungen */}
      <AdminAbsenceDashboard user={user} />
    </div>
  );
}