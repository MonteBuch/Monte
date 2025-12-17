// src/components/profile/ProfileSecurity.jsx
import React, { useState } from "react";
import {
  ArrowLeft,
  Save,
  Loader2,
} from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import ProfileDeleteConfirm from "./ProfileDeleteConfirm";

export default function ProfileSecurity({
  user,
  onBack,
  onUpdateUser,
  onDeleteAccount,
}) {
  const [newPw1, setNewPw1] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Biometric-Flag bleibt in localStorage (gerätespezifisch)
  const biomKey = `bio_${user.id}`;
  const [biometric, setBiometric] = useState(
    localStorage.getItem(biomKey) === "1"
  );

  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleBiometric = () => {
    const newVal = !biometric;
    setBiometric(newVal);
    localStorage.setItem(biomKey, newVal ? "1" : "0");
  };

  const handlePw = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newPw1 || !newPw2) {
      return setError("Bitte beide Felder ausfüllen.");
    }
    if (newPw1.length < 6) {
      return setError("Passwort muss mindestens 6 Zeichen haben.");
    }
    if (newPw1 !== newPw2) {
      return setError("Passwörter stimmen nicht überein.");
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPw1,
      });

      if (updateError) throw updateError;

      setSuccess("Passwort erfolgreich geändert.");
      setNewPw1("");
      setNewPw2("");
    } catch (err) {
      console.error("Passwort-Änderung fehlgeschlagen:", err);
      setError(err.message || "Passwort konnte nicht geändert werden.");
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* BACK */}
      <button
        className="flex items-center text-stone-500 gap-2 text-sm"
        onClick={onBack}
      >
        <ArrowLeft size={18} />
        Zurück
      </button>

      <h2 className="text-lg font-bold text-stone-800">Sicherheit</h2>

      {/* BIOMETRIC */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-3 flex justify-between items-center">
        <div>
          <p className="font-semibold text-sm text-stone-800">
            Biometrischer Login
          </p>
          <p className="text-xs text-stone-500 mt-1">
            FaceID / Fingerprint aktivieren
          </p>
        </div>

        <button
          onClick={toggleBiometric}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
            biometric
              ? "bg-amber-500 text-white"
              : "bg-stone-200 text-stone-600"
          }`}
        >
          {biometric ? "AN" : "AUS"}
        </button>
      </div>

      {/* PW CHANGE */}
      <form
        onSubmit={handlePw}
        className="bg-white p-5 rounded-2xl border border-stone-200 space-y-3"
      >
        <p className="font-semibold text-sm text-stone-800">
          Passwort ändern
        </p>

        <input
          type="password"
          placeholder="Neues Passwort"
          value={newPw1}
          onChange={(e) => setNewPw1(e.target.value)}
          className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl"
          minLength={6}
        />
        <input
          type="password"
          placeholder="Neues Passwort wiederholen"
          value={newPw2}
          onChange={(e) => setNewPw2(e.target.value)}
          className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl"
          minLength={6}
        />

        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-3 rounded-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="text-xs text-green-600 bg-green-50 p-3 rounded-xl">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-bold hover:bg-amber-600 active:scale-[0.99] disabled:opacity-50"
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

      {/* DELETE */}
      <button
        onClick={() => setConfirmDelete(true)}
        className="w-full bg-red-500 text-white rounded-xl py-3 font-bold hover:bg-red-600 active:scale-[0.99]"
      >
        Profil löschen
      </button>

      {confirmDelete && (
        <ProfileDeleteConfirm
          user={user}
          onCancel={() => setConfirmDelete(false)}
          onDelete={() => {
            setConfirmDelete(false);
            onDeleteAccount();
          }}
        />
      )}
    </div>
  );
}
