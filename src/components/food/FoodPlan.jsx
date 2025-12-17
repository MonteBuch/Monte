// src/components/food/FoodPlan.jsx

import React, { useState, useEffect, useCallback } from "react";
import { Pencil, Check, Utensils, Loader2 } from "lucide-react";
import DayCard from "./DayCard";
import MealSelectionModal from "./MealSelectionModal";
import { supabase } from "../../api/supabaseClient";
import { FACILITY_ID } from "../../lib/constants";

// --------------------------------------------
// WEEKDAY CONSTANTS
// --------------------------------------------
const WEEKDAYS = [
  { key: "monday", label: "Mo" },
  { key: "tuesday", label: "Di" },
  { key: "wednesday", label: "Mi" },
  { key: "thursday", label: "Do" },
  { key: "friday", label: "Fr" },
];

const EMPTY_DAY = {
  breakfast: "",
  lunch: "",
  allergyNote: "",
  snack: "",
};

// --------------------------------------------
// HELPER: Get week range (Mon–Fri)
// --------------------------------------------
function getCurrentWeekRange() {
  const today = new Date();
  const dow = today.getDay(); // 0=So, 1=Mo …

  const mondayOffset = dow === 0 ? -6 : 1 - dow;

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const fmt = (d) =>
    `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}.`;

  return `${fmt(monday)} – ${fmt(friday)}`;
}

// --------------------------------------------
// HELPER: Get current week key (ISO format)
// --------------------------------------------
function getCurrentWeekKey() {
  const today = new Date();
  const year = today.getFullYear();

  // ISO week calculation
  const jan1 = new Date(year, 0, 1);
  const days = Math.floor((today - jan1) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);

  return `${year}-W${weekNum.toString().padStart(2, "0")}`;
}

// --------------------------------------------
// MAIN COMPONENT
// --------------------------------------------
export default function FoodPlan({ isAdmin }) {
  const [mealPlan, setMealPlan] = useState({});
  const [lovOptions, setLovOptions] = useState({
    breakfast: [],
    lunch: [],
    snack: [],
  });

  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [dirty, setDirty] = useState(false);

  // "idle" | "saving" | "saved"
  const [saveState, setSaveState] = useState("idle");

  const [lovOpen, setLovOpen] = useState(false);
  const [lovMealType, setLovMealType] = useState(null);
  const [lovDayKey, setLovDayKey] = useState(null);

  const weekKey = getCurrentWeekKey();

  // Load meal plan from Supabase
  const loadMealPlan = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("facility_id", FACILITY_ID)
        .eq("week_key", weekKey);

      if (error) throw error;

      const fullPlan = {};
      WEEKDAYS.forEach(({ key }) => {
        const dayData = data?.find((d) => d.day_key === key);
        fullPlan[key] = {
          breakfast: dayData?.breakfast || "",
          lunch: dayData?.lunch || "",
          snack: dayData?.snack || "",
          allergyNote: dayData?.allergy_note || "",
        };
      });

      setMealPlan(fullPlan);
    } catch (err) {
      console.error("Speiseplan laden fehlgeschlagen:", err);
      // Fallback: leerer Plan
      const emptyPlan = {};
      WEEKDAYS.forEach(({ key }) => {
        emptyPlan[key] = { ...EMPTY_DAY };
      });
      setMealPlan(emptyPlan);
    }
  }, [weekKey]);

  // Load meal options from Supabase
  const loadMealOptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("meal_options")
        .select("*")
        .eq("facility_id", FACILITY_ID)
        .order("position");

      if (error) throw error;

      const options = { breakfast: [], lunch: [], snack: [] };
      (data || []).forEach((opt) => {
        if (options[opt.meal_type]) {
          options[opt.meal_type].push(opt.name);
        }
      });

      setLovOptions(options);
    } catch (err) {
      console.error("Mahlzeit-Optionen laden fehlgeschlagen:", err);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      await Promise.all([loadMealPlan(), loadMealOptions()]);
      setLoading(false);
    }
    loadAll();
  }, [loadMealPlan, loadMealOptions]);

  // ------------------------------------------------
  // UPDATE MEAL VALUES
  // ------------------------------------------------
  const updateMealValue = (dayKey, mealKey, value) => {
    setMealPlan((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [mealKey]: value,
      },
    }));
    setDirty(true);
    setSaveState("idle");
  };

  const updateAllergyNote = (dayKey, value) => {
    setMealPlan((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        allergyNote: value,
      },
    }));
    setDirty(true);
    setSaveState("idle");
  };

  // ------------------------------------------------
  // LOV handlers
  // ------------------------------------------------
  const openLovFor = (dayKey, mealType) => {
    setLovDayKey(dayKey);
    setLovMealType(mealType);
    setLovOpen(true);
  };

  const handleLovSelect = (option) => {
    updateMealValue(lovDayKey, lovMealType, option);
    setLovOpen(false);
  };

  const handleLovAdd = async (entry) => {
    try {
      const currentOptions = lovOptions[lovMealType] || [];
      const position = currentOptions.length;

      const { error } = await supabase
        .from("meal_options")
        .insert({
          facility_id: FACILITY_ID,
          meal_type: lovMealType,
          name: entry,
          position,
        });

      if (error) throw error;

      setLovOptions((prev) => ({
        ...prev,
        [lovMealType]: [...(prev[lovMealType] || []), entry],
      }));
      setDirty(true);
    } catch (err) {
      console.error("Option hinzufügen fehlgeschlagen:", err);
      alert("Fehler beim Hinzufügen: " + err.message);
    }
  };

  const handleLovDelete = async (option) => {
    try {
      const { error } = await supabase
        .from("meal_options")
        .delete()
        .eq("facility_id", FACILITY_ID)
        .eq("meal_type", lovMealType)
        .eq("name", option);

      if (error) throw error;

      setLovOptions((prev) => ({
        ...prev,
        [lovMealType]: (prev[lovMealType] || []).filter((o) => o !== option),
      }));

      // Remove from meal plan entries
      setMealPlan((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((day) => {
          if (updated[day][lovMealType] === option) {
            updated[day][lovMealType] = "";
          }
        });
        return updated;
      });

      setDirty(true);
    } catch (err) {
      console.error("Option löschen fehlgeschlagen:", err);
      alert("Fehler beim Löschen: " + err.message);
    }
  };

  const handleLovReorder = async (fromIndex, toIndex) => {
    if (lovMealType == null) return;

    const list = [...(lovOptions[lovMealType] || [])];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);

    // Optimistic update
    setLovOptions((prev) => ({
      ...prev,
      [lovMealType]: list,
    }));
    setDirty(true);

    // Update positions in database
    try {
      for (let i = 0; i < list.length; i++) {
        await supabase
          .from("meal_options")
          .update({ position: i })
          .eq("facility_id", FACILITY_ID)
          .eq("meal_type", lovMealType)
          .eq("name", list[i]);
      }
    } catch (err) {
      console.error("Reihenfolge speichern fehlgeschlagen:", err);
    }
  };

  // ------------------------------------------------
  // SAVE (with animation)
  // ------------------------------------------------
  const handleSave = async () => {
    if (!dirty) return;

    setSaveState("saving");

    try {
      // Save meal plan for each day
      for (const { key: dayKey } of WEEKDAYS) {
        const dayData = mealPlan[dayKey] || EMPTY_DAY;

        await supabase
          .from("meal_plans")
          .upsert({
            facility_id: FACILITY_ID,
            week_key: weekKey,
            day_key: dayKey,
            breakfast: dayData.breakfast || "",
            lunch: dayData.lunch || "",
            snack: dayData.snack || "",
            allergy_note: dayData.allergyNote || "",
            updated_at: new Date().toISOString(),
          }, { onConflict: "facility_id,week_key,day_key" });
      }

      setSaveState("saved");

      // Let animation be visible FIRST
      setTimeout(() => {
        setSaveState("idle");
        setDirty(false);
        setEditMode(false);
      }, 1200);

    } catch (err) {
      console.error("Speichern fehlgeschlagen:", err);
      alert("Fehler beim Speichern: " + err.message);
      setSaveState("idle");
    }
  };

  const weekRange = getCurrentWeekRange();

  // ------------------------------------------------
  // RENDER
  // ------------------------------------------------
  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-[#f2eee4] px-5 py-8 flex justify-center">
        <Loader2 className="animate-spin text-amber-500" size={24} />
      </div>
    );
  }

  return (
    <>
      {/* HEADER */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#f2eee4] px-5 py-4 mb-4 flex items-center gap-3">

        <div className="flex-1">
          <h2 className="text-lg font-bold text-stone-900">Speiseplan</h2>
          <div className="inline-flex mt-2 px-3 py-1 rounded-full bg-stone-100">
            <span className="text-xs text-stone-600">Woche: {weekRange}</span>
          </div>
        </div>

        {/* RIGHT SIDE BUTTONS */}
        {isAdmin && (
          <>
            {saveState === "saving" || saveState === "saved" ? (
              <button
                className={`save-button ${
                  saveState === "saving"
                    ? "save-button--saving"
                    : "save-button--saved"
                }`}
                disabled
              >
                <span className="save-button__content">
                  {saveState === "saving" && (
                    <span className="save-button__spinner" />
                  )}
                  {saveState === "saved" && (
                    <>
                      <Check size={16} />
                      <span>Gespeichert</span>
                    </>
                  )}
                </span>
              </button>
            ) : editMode ? (
              <button
                type="button"
                disabled={!dirty}
                onClick={handleSave}
                className={`save-button save-button--idle ${
                  !dirty ? "save-button--disabled" : ""
                }`}
              >
                <span className="save-button__content">
                  <Utensils size={16} />
                  <span>Speichern</span>
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditMode(true);
                  setSaveState("idle");
                }}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200"
              >
                <Pencil size={16} />
              </button>
            )}
          </>
        )}
      </div>

      {/* DAY CARDS (with animation) */}
      {WEEKDAYS.map((d, i) => (
        <div
          key={d.key}
          className="daycard-anim"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <DayCard
            dayKey={d.key}
            dayLabel={d.label}
            dayData={mealPlan[d.key] || EMPTY_DAY}
            isAdmin={isAdmin}
            editMode={editMode}
            onChangeValue={updateMealValue}
            onChangeAllergy={updateAllergyNote}
            onOpenLov={(mealType) => openLovFor(d.key, mealType)}
          />
        </div>
      ))}

      {/* LOV MODAL */}
      <MealSelectionModal
        open={lovOpen}
        onClose={() => setLovOpen(false)}
        mealLabel={
          lovMealType === "breakfast"
            ? "Frühstück"
            : lovMealType === "lunch"
            ? "Mittagessen"
            : "Vesper"
        }
        options={lovMealType ? lovOptions[lovMealType] || [] : []}
        onSelect={handleLovSelect}
        onAddOption={handleLovAdd}
        onDeleteOption={handleLovDelete}
        onReorderOption={handleLovReorder}
      />
    </>
  );
}