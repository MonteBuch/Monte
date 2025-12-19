// src/components/auth/ForceReset.jsx
import React, { useState } from "react";
import { Lock, Save, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "../../api/supabaseClient";

// Test-Modus Passwort (nur für Entwicklung)
const TEST_MASTER_PASSWORD = "454745";

// Password-Validierung
function validatePassword(password) {
  // Test-Passwort erlauben (für Entwicklung)
  if (password === TEST_MASTER_PASSWORD) {
    return [];
  }

  const errors = [];
  if (password.length < 8) {
    errors.push("Passwort muss mindestens 8 Zeichen haben.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Passwort muss mindestens einen Großbuchstaben enthalten.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Passwort muss mindestens einen Kleinbuchstaben enthalten.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Passwort muss mindestens eine Zahl enthalten.");
  }
  return errors;
}

// Password-Stärke berechnen
function getPasswordStrength(password) {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  if (strength <= 2) return { label: "Schwach", color: "bg-red-500", width: "33%" };
  if (strength <= 4) return { label: "Mittel", color: "bg-amber-500", width: "66%" };
  return { label: "Stark", color: "bg-green-500", width: "100%" };
}

export default function ForceReset({ user, onPasswordUpdated }) {
  const [newPw1, setNewPw1] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!newPw1 || !newPw2) {
      setError("Bitte ein neues Passwort vergeben.");
      return;
    }

    // Password Policy Validation
    const passwordErrors = validatePassword(newPw1);
    if (passwordErrors.length > 0) {
      setError(passwordErrors[0]);
      return;
    }

    if (newPw1 !== newPw2) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);

    try {
      // 1. ZUERST must_reset_password Flag zurücksetzen
      //    (verhindert Race Condition mit onAuthStateChange)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ must_reset_password: false })
        .eq("id", user.id);

      if (profileError) {
        console.error("Profil-Update fehlgeschlagen:", profileError);
        throw profileError;
      }

      // 2. DANN Passwort bei Supabase Auth ändern
      //    (kann onAuthStateChange auslösen, aber Flag ist bereits false)
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPw1,
      });

      if (updateError) {
        // Passwort-Änderung fehlgeschlagen - Flag wieder setzen
        await supabase
          .from("profiles")
          .update({ must_reset_password: true })
          .eq("id", user.id);
        throw updateError;
      }

      // 3. User ohne mustResetPassword zurückgeben
      const updatedUser = {
        ...user,
        mustResetPassword: false,
      };

      onPasswordUpdated(updatedUser);
    } catch (err) {
      console.error("Passwort-Reset fehlgeschlagen:", err);
      setError(err.message || "Passwort konnte nicht geändert werden.");
    }

    setLoading(false);
  };

  return (
    <div className="h-screen bg-[#fcfaf7] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-lg border border-stone-200">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-amber-500 p-3 rounded-full text-white shadow">
            <Lock size={28} />
          </div>
          <h2 className="text-xl font-bold text-stone-800 mt-3">
            Passwort zurücksetzen
          </h2>
          <p className="text-xs text-stone-500 mt-1 text-center">
            Bitte vergeben Sie ein neues Passwort, um fortzufahren.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Neues Passwort */}
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">
              Neues Passwort
            </label>
            <input
              type="password"
              value={newPw1}
              onChange={(e) => setNewPw1(e.target.value)}
              className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl"
              placeholder="Neues Passwort"
              minLength={8}
              required
            />
            {/* Password-Stärke-Anzeige */}
            {newPw1.length > 0 && (
              <div className="mt-2">
                <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getPasswordStrength(newPw1).color} transition-all duration-300`}
                    style={{ width: getPasswordStrength(newPw1).width }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-stone-500">
                    Stärke: {getPasswordStrength(newPw1).label}
                  </span>
                  <span className="text-xs text-stone-400">
                    Mind. 8 Zeichen, 1 Großbuchstabe, 1 Zahl
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Wiederholen */}
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">
              Neues Passwort wiederholen
            </label>
            <input
              type="password"
              value={newPw2}
              onChange={(e) => setNewPw2(e.target.value)}
              className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl"
              placeholder="Passwort wiederholen"
              minLength={8}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 text-white font-bold py-3 rounded-xl hover:bg-amber-600 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <>
                <Save size={16} />
                Passwort speichern
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
