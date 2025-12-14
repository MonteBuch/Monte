import React, { useState } from "react";
import { X } from "lucide-react";
import { createProfileUser } from "../../api/adminUserApi";

export default function CreateUserModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("parent");
  const [primaryGroup, setPrimaryGroup] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      alert("Name fehlt");
      return;
    }

    try {
      setSaving(true);
      await createProfileUser({
        full_name: name,
        role,
        primary_group: primaryGroup
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Benutzer konnte nicht angelegt werden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center px-5 py-4 border-b">
          <h3 className="font-bold text-lg">Benutzer anlegen</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-4 text-sm">
          <div>
            <label className="text-xs text-stone-500">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-2 py-1"
            />
          </div>

          <div>
            <label className="text-xs text-stone-500">Rolle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-2 py-1"
            >
              <option value="parent">Eltern</option>
              <option value="team">Team</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {role === "team" && (
            <div>
              <label className="text-xs text-stone-500">Stammgruppe</label>
              <input
                value={primaryGroup}
                onChange={(e) => setPrimaryGroup(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-2 py-1"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-xl">
            Abbrechen
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-xl bg-stone-900 text-white"
          >
            {saving ? "Anlegen…" : "Anlegen"}
          </button>
        </div>
      </div>
    </div>
  );
}