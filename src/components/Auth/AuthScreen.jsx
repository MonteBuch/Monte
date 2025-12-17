import React, { useState, useEffect } from "react";
import {
  Sprout,
  KeyRound,
  Plus,
  X,
  AlertTriangle,
  Loader2,
  Shield,
  CalendarDays,
  StickyNote,
} from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";
import { getGroupById, getGroupStyles } from "../../utils/groupUtils";

export default function AuthScreen({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);

  const [role, setRole] = useState("parent");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [parentCode, setParentCode] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [adminCode, setAdminCode] = useState("");

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const defaultGroupId = groups.find(g => g.id !== "event")?.id || null;

  const [children, setChildren] = useState([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Gruppen aus Supabase laden
  useEffect(() => {
    async function loadGroups() {
      try {
        const { data, error } = await supabase
          .from("groups")
          .select("*")
          .eq("facility_id", FACILITY_ID)
          .order("position");

        if (error) throw error;
        setGroups(data || []);
      } catch (err) {
        console.error("Fehler beim Laden der Gruppen:", err);
      } finally {
        setLoadingGroups(false);
      }
    }
    loadGroups();
  }, []);

  // Default-Kind setzen wenn Gruppen geladen
  useEffect(() => {
    if (groups.length > 0 && children.length === 0) {
      const firstGroup = groups.find(g => !g.is_event_group) || groups[0];
      setChildren([{
        id: crypto.randomUUID(),
        name: "",
        group: firstGroup?.id || null,
        birthday: "",
        notes: "",
      }]);
    }
  }, [groups]);

  const handleAddChild = () => {
    const firstGroup = groups.find(g => !g.is_event_group) || groups[0];
    setChildren((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        group: firstGroup?.id || null,
        birthday: "",
        notes: "",
      },
    ]);
  };

  const handleRemoveChild = (index) => {
    setChildren((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChildChange = (index, field, value) => {
    setChildren((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  // Code validieren über Supabase
  const validateCode = async (code, role) => {
    try {
      const { data, error } = await supabase.rpc("validate_registration_code", {
        p_code: code,
        p_role: role,
        p_facility_id: FACILITY_ID,
      });
      if (error) throw error;
      return data === true;
    } catch (err) {
      console.error("Code-Validierung fehlgeschlagen:", err);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        // === REGISTRIERUNG ===
        if (!email || !password || !name) {
          throw new Error("Bitte alle Pflichtfelder ausfüllen.");
        }

        if (password.length < 6) {
          throw new Error("Passwort muss mindestens 6 Zeichen haben.");
        }

        // Code validieren
        const codeToValidate =
          role === "parent" ? parentCode :
          role === "team" ? teamCode : adminCode;

        const isValidCode = await validateCode(codeToValidate, role);
        if (!isValidCode) {
          throw new Error(`Ungültiger ${role === "parent" ? "Eltern" : role === "team" ? "Team" : "Admin"}-Code.`);
        }

        // Kinder validieren (bei Eltern)
        if (role === "parent") {
          if (children.length === 0) {
            throw new Error("Bitte mindestens ein Kind hinzufügen.");
          }
          const invalidChild = children.find(c => !c.name || !c.group);
          if (invalidChild) {
            throw new Error("Bitte für jedes Kind Name und Gruppe angeben.");
          }
        }

        // 1. Auth-User erstellen
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
        });

        if (signUpError) {
          if (signUpError.message.includes("already registered")) {
            throw new Error("Diese E-Mail ist bereits registriert.");
          }
          throw signUpError;
        }

        const userId = authData.user?.id;
        if (!userId) {
          throw new Error("Registrierung fehlgeschlagen. Bitte erneut versuchen.");
        }

        // 2. Profil erstellen oder updaten (Trigger erstellt evtl. schon ein leeres Profil)
        const primaryGroup = role === "parent"
          ? null
          : (groups.find(g => !g.is_event_group)?.id || null);

        // Erst versuchen zu updaten (falls Trigger das Profil schon erstellt hat)
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            facility_id: FACILITY_ID,
            full_name: name,
            role,
            primary_group: primaryGroup,
          })
          .eq("id", userId);

        if (updateError) {
          // Falls Update fehlschlägt, versuche Insert
          const { error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: userId,
              facility_id: FACILITY_ID,
              full_name: name,
              role,
              primary_group: primaryGroup,
            });

          if (insertError) {
            console.error("Profil-Fehler:", insertError);
            throw new Error("Profil konnte nicht erstellt werden.");
          }
        }

        // 3. Kinder erstellen (bei Eltern)
        if (role === "parent" && children.length > 0) {
          console.log("[Auth] Erstelle Kinder für User:", userId);
          console.log("[Auth] Kinder-Daten:", children);

          const childrenToInsert = children.map(c => ({
            facility_id: FACILITY_ID,
            user_id: userId,
            first_name: c.name,
            group_id: c.group,
            birthday: c.birthday || null,
            notes: c.notes || null,
          }));

          console.log("[Auth] Insert-Daten:", childrenToInsert);

          const { data: insertedChildren, error: childrenError } = await supabase
            .from("children")
            .insert(childrenToInsert)
            .select();

          if (childrenError) {
            console.error("[Auth] Kinder-Fehler:", childrenError);
            console.error("[Auth] Fehler-Details:", JSON.stringify(childrenError, null, 2));
            // Warnung anzeigen, aber Registrierung fortsetzen
            console.warn("[Auth] Kinder konnten nicht erstellt werden - RLS-Policy Problem?");
          } else {
            console.log("[Auth] Kinder erfolgreich erstellt:", insertedChildren);
          }
        }

        // 4. User-Daten für App laden
        const userData = await loadUserProfile(userId);
        onLogin(userData);

      } else {
        // === LOGIN ===
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password,
        });

        if (signInError) {
          if (signInError.message.includes("Invalid login")) {
            throw new Error("Ungültige Zugangsdaten.");
          }
          throw signInError;
        }

        const userId = authData.user?.id;
        if (!userId) {
          throw new Error("Login fehlgeschlagen.");
        }

        // User-Daten laden
        const userData = await loadUserProfile(userId);
        onLogin(userData);
      }
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  // User-Profil aus Supabase laden
  const loadUserProfile = async (userId) => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        role,
        primary_group,
        facility_id,
        children (
          id,
          first_name,
          birthday,
          notes,
          group_id
        )
      `)
      .eq("id", userId)
      .single();

    if (error) throw error;

    // Format für App (Kompatibilität mit bestehendem Code)
    return {
      id: profile.id,
      name: profile.full_name,
      role: profile.role,
      primaryGroup: profile.primary_group,
      facilityId: profile.facility_id,
      children: (profile.children || []).map(c => ({
        id: c.id,
        name: c.first_name,
        group: c.group_id,
        birthday: c.birthday,
        notes: c.notes,
      })),
    };
  };

  // Gruppen für Anzeige filtern (ohne Event-Gruppe)
  const displayGroups = groups.filter(g => !g.is_event_group);

  return (
    <div className="h-screen bg-[#fcfaf7] flex flex-col items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md py-10">
        {/* LOGO */}
        <div className="text-center mb-6">
          <div className="bg-amber-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Sprout className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-stone-800">
            Montessori Kinderhaus
          </h1>
          <p className="text-stone-500 text-sm italic mt-1">Berlin-Buch</p>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-stone-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-stone-700">
              {isRegistering ? "Registrieren" : "Anmelden"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setIsRegistering((v) => !v);
                setError("");
              }}
              className="text-xs text-amber-600 font-bold hover:underline"
            >
              {isRegistering ? "Zum Login" : "Konto erstellen"}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Registrierung */}
            {isRegistering && (
              <>
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase mb-1">
                    Vollständiger Name
                  </label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200"
                  />
                </div>

                {/* Rollen */}
                <div className="flex items-center gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setRole("parent")}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold ${
                      role === "parent"
                        ? "bg-white shadow text-stone-800"
                        : "text-stone-400"
                    }`}
                  >
                    Elternteil
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("team")}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold ${
                      role === "team"
                        ? "bg-white shadow text-stone-800"
                        : "text-stone-400"
                    }`}
                  >
                    Kita-Team
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("admin")}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold ${
                      role === "admin"
                        ? "bg-white shadow text-stone-800"
                        : "text-stone-400"
                    }`}
                  >
                    Admin
                  </button>
                </div>

                {/* Codes */}
                {role === "parent" && (
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase mb-1 flex items-center gap-1">
                      <KeyRound size={12} /> Eltern-Code
                    </label>
                    <input
                      required
                      type="password"
                      value={parentCode}
                      onChange={(e) => setParentCode(e.target.value)}
                      className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200"
                    />
                  </div>
                )}

                {role === "team" && (
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase mb-1 flex items-center gap-1">
                      <KeyRound size={12} /> Team-Code
                    </label>
                    <input
                      required
                      type="password"
                      value={teamCode}
                      onChange={(e) => setTeamCode(e.target.value)}
                      className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200"
                    />
                  </div>
                )}

                {role === "admin" && (
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase mb-1 flex items-center gap-1">
                      <Shield size={12} /> Admin-Code
                    </label>
                    <input
                      required
                      type="password"
                      value={adminCode}
                      onChange={(e) => setAdminCode(e.target.value)}
                      className="w-full p-3 bg-amber-50 rounded-xl border border-amber-200"
                    />
                  </div>
                )}

                {/* KINDER */}
                {role === "parent" && !loadingGroups && (
                  <>
                    <label className="block text-xs font-bold text-stone-400 uppercase mt-4 mb-1">
                      Ihre Kinder
                    </label>

                    {children.map((child, index) => {
                      const group = displayGroups.find(g => g.id === child.group);
                      const groupStyles = getGroupStyles(group);

                      return (
                        <div
                          key={child.id}
                          className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3 relative"
                        >
                          {children.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveChild(index)}
                              className="absolute top-2 right-2 bg-white p-1 rounded-full text-stone-400 hover:text-red-500 shadow-sm"
                            >
                              <X size={14} />
                            </button>
                          )}

                          <input
                            required
                            type="text"
                            placeholder="Vorname"
                            value={child.name}
                            onChange={(e) =>
                              handleChildChange(index, "name", e.target.value)
                            }
                            className="w-full p-2 bg-white rounded-lg text-sm border border-stone-200"
                          />

                          {/* Gruppe */}
                          <div className="grid grid-cols-2 gap-2">
                            {displayGroups.map((g) => {
                              const styles = getGroupStyles(g);

                              return (
                                <button
                                  type="button"
                                  key={g.id}
                                  onClick={() =>
                                    handleChildChange(index, "group", g.id)
                                  }
                                  className={`p-2 rounded-lg text-xs flex items-center justify-center gap-1 border ${
                                    child.group === g.id
                                      ? `${styles.chipClass} border-transparent shadow-sm`
                                      : "bg-white border-stone-200 text-stone-500 hover:bg-stone-100"
                                  }`}
                                >
                                  <styles.Icon size={12} /> {styles.name}
                                </button>
                              );
                            })}
                          </div>

                          {/* Geburtstag */}
                          <div>
                            <label className="block text-xs text-stone-500 mb-1 flex items-center gap-1">
                              <CalendarDays size={12} /> Geburtstag (optional)
                            </label>
                            <input
                              type="date"
                              value={child.birthday || ""}
                              onChange={(e) =>
                                handleChildChange(
                                  index,
                                  "birthday",
                                  e.target.value
                                )
                              }
                              className="w-full p-2 bg-white rounded-lg border border-stone-200 text-sm"
                            />
                          </div>

                          {/* Hinweise */}
                          <div>
                            <label className="block text-xs text-stone-500 mb-1 flex items-center gap-1">
                              <StickyNote size={12} /> Hinweise / Allergien
                              (optional)
                            </label>
                            <textarea
                              rows={2}
                              value={child.notes || ""}
                              onChange={(e) =>
                                handleChildChange(
                                  index,
                                  "notes",
                                  e.target.value
                                )
                              }
                              className="w-full p-2 bg-white rounded-lg border border-stone-200 text-sm resize-none"
                              placeholder="Allergien oder Hinweise"
                            />
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={handleAddChild}
                      className="w-full py-2 border-2 border-dashed border-amber-200 text-amber-600 text-sm font-bold rounded-xl flex justify-center items-center gap-1 hover:bg-amber-50"
                    >
                      <Plus size={16} /> Kind hinzufügen
                    </button>
                  </>
                )}
              </>
            )}

            {/* E-MAIL / PASSWORT */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1">
                  E-Mail
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200"
                  placeholder="name@beispiel.de"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1">
                  Passwort
                </label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200"
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 p-3 rounded-xl flex items-start gap-2 text-red-600 text-xs">
                <AlertTriangle size={16} className="mt-0.5" />
                {error}
              </div>
            )}

            <button
              disabled={loading || loadingGroups}
              type="submit"
              className="w-full bg-stone-800 text-white font-bold py-4 rounded-xl hover:bg-stone-900 mt-4 flex justify-center shadow-md disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : isRegistering ? (
                "Konto erstellen"
              ) : (
                "Anmelden"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
