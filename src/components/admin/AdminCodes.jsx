// src/components/admin/AdminCodes.jsx
import React, { useEffect, useState, useCallback } from "react";
import { KeyRound, Info, Loader2 } from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";
import SaveButton from "../ui/SaveButton";

export default function AdminCodes() {
  const [codes, setCodes] = useState({
    parent: "",
    team: "",
    admin: "",
  });

  const [initial, setInitial] = useState(codes);
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------------------------
     LOAD — Codes aus Supabase laden
     ------------------------------------------------------------- */
  const loadCodes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("registration_codes")
        .select("*")
        .eq("facility_id", FACILITY_ID);

      if (error) throw error;

      const loaded = {
        parent: data?.find((c) => c.role === "parent")?.code || "",
        team: data?.find((c) => c.role === "team")?.code || "",
        admin: data?.find((c) => c.role === "admin")?.code || "",
      };

      setCodes(loaded);
      setInitial(loaded);
    } catch (err) {
      console.error("Codes laden fehlgeschlagen:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCodes();
  }, [loadCodes]);

  const changed = JSON.stringify(codes) !== JSON.stringify(initial);

  /* -------------------------------------------------------------
     CHANGE HANDLER
     ------------------------------------------------------------- */
  const update = (key, value) => {
    setCodes((prev) => ({
      ...prev,
      [key]: value.trim(),
    }));
  };

  /* -------------------------------------------------------------
     SAVE — Codes in Supabase speichern
     ------------------------------------------------------------- */
  const save = async () => {
    try {
      // Alle drei Codes aktualisieren
      for (const role of ["parent", "team", "admin"]) {
        await supabase
          .from("registration_codes")
          .upsert({
            facility_id: FACILITY_ID,
            role,
            code: codes[role].trim(),
          }, { onConflict: "facility_id,role" });
      }

      setInitial({ ...codes });
    } catch (err) {
      console.error("Codes speichern fehlgeschlagen:", err);
      alert("Fehler beim Speichern: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex justify-center">
        <Loader2 className="animate-spin text-amber-500" size={24} />
      </div>
    );
  }

  /* -------------------------------------------------------------
     UI
     ------------------------------------------------------------- */
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-stone-800">Zugangscodes</h2>

      {/* Hinweisbox */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <Info size={18} />
        <p>
          Änderungen an den Codes beeinflussen nur **neue Registrierungen**.  
          Bereits bestehende Profile bleiben unverändert.
        </p>
      </div>

      {/* Parent Code */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-2">
        <label className="text-xs uppercase text-stone-500 font-semibold flex items-center gap-2">
          <KeyRound size={16} />
          Eltern-Code
        </label>
        <input
          className="w-full p-3 rounded-xl bg-stone-50 border border-stone-300 text-sm"
          value={codes.parent}
          onChange={(e) => update("parent", e.target.value)}
          placeholder="z. B. PARENT-2024"
        />
      </div>

      {/* Team Code */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-2">
        <label className="text-xs uppercase text-stone-500 font-semibold flex items-center gap-2">
          <KeyRound size={16} />
          Team-Code
        </label>
        <input
          className="w-full p-3 rounded-xl bg-stone-50 border border-stone-300 text-sm"
          value={codes.team}
          onChange={(e) => update("team", e.target.value)}
          placeholder="z. B. TEAM-2024"
        />
      </div>

      {/* Admin Code */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-2">
        <label className="text-xs uppercase text-stone-500 font-semibold flex items-center gap-2">
          <KeyRound size={16} />
          Admin-Code
        </label>
        <input
          className="w-full p-3 rounded-xl bg-stone-50 border border-stone-300 text-sm"
          value={codes.admin}
          onChange={(e) => update("admin", e.target.value)}
          placeholder="z. B. ADMIN-2024"
        />
      </div>

      {/* SAVE BUTTON */}
      <SaveButton
        isDirty={changed}
        onClick={save}
        label="Codes speichern"
      />
    </div>
  );
}