// src/lib/storage.js
import {
  DEFAULT_PARENT_CODE,
  DEFAULT_TEAM_CODE,
  DEFAULT_ADMIN_CODE,
  GROUPS,
} from "./constants.jsx";

const PREFIX = "montessori_kita";
const key = (name) => `${PREFIX}_${name}`;

const safeGet = (k, fallback) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error("Storage get error", e);
    return fallback;
  }
};

const safeSet = (k, value) => {
  try {
    localStorage.setItem(k, JSON.stringify(value));
  } catch (e) {
    console.error("Storage set error", e);
  }
};

export const StorageService = {
  get(collection) {
    return safeGet(key(collection), []);
  },

  set(collection, data) {
    safeSet(key(collection), data);
  },

  add(collection, item) {
    const items = this.get(collection);
    const newItem = {
      id:
        item.id ||
        Date.now().toString(36) + Math.random().toString(36).slice(2),
      ...item,
    };
    items.push(newItem);
    this.set(collection, items);
    return newItem;
  },

  delete(collection, id) {
    const items = this.get(collection);
    this.set(
      collection,
      items.filter((i) => i.id !== id)
    );
  },

  update(collection, updatedItem) {
    const items = this.get(collection);
    const idx = items.findIndex((i) => i.id === updatedItem.id);
    if (idx >= 0) {
      items[idx] = updatedItem;
      this.set(collection, items);
    }
  },

  // ---- GRUPPEN (Zentralisiert) ----
  getGroups() {
    const facility = this.getFacilitySettings();
    if (facility && facility.groups && facility.groups.length > 0) {
      return facility.groups;
    }
    return GROUPS;
  },

  saveGroups(newGroups) {
    const facility = this.getFacilitySettings();
    this.saveFacilitySettings({
      ...facility,
      groups: newGroups,
    });
  },

  getAbsences() {
    return this.get("absences");
  },
  saveAbsences(list) {
    this.set("absences", list);
  },

  getMealPlan() {
    return this.get("mealplan");
  },
  saveMealPlan(plan) {
    this.set("mealplan", plan);
  },

  getDefaultGroups() {
    return GROUPS;
  },

  // ✅ HIER IST DER WICHTIGE TEIL – KOMPLETT SAUBER & DEFINITIV
  getFacilitySettings() {
    const defaults = {
      name: "Montessori Kinderhaus",
      location: "",
      openingHours: "",
      codes: {
        parent: DEFAULT_PARENT_CODE,
        team: DEFAULT_TEAM_CODE,
        admin: DEFAULT_ADMIN_CODE,
      },
      groups: GROUPS,
    };

    let current = safeGet(key("facility_settings"), null);

    // ✅ ERSTSTART → Defaults setzen
    if (!current) {
      current = defaults;
      safeSet(key("facility_settings"), current);
      return current;
    }

    // ✅ EVENT-GRUPPE IMMER ERZINGEN (auch bei bestehenden Daten!)
    if (current.groups && !current.groups.find((g) => g.id === "event")) {
      current.groups = [
        {
          id: "event",
          name: "Event",
          color: "bg-stone-300 text-stone-800",
          icon: "rainbow",
          special: "event",
        },
        ...current.groups,
      ];
      safeSet(key("facility_settings"), current);
    }

    return {
      ...defaults,
      ...current,
      codes: {
        ...defaults.codes,
        ...(current.codes || {}),
      },
      groups:
        current.groups && current.groups.length > 0
          ? current.groups
          : defaults.groups,
    };
  },

  saveFacilitySettings(settings) {
    const current = this.getFacilitySettings();
    const merged = {
      ...current,
      ...settings,
      codes: {
        ...current.codes,
        ...(settings.codes || {}),
      },
      groups:
        settings.groups && settings.groups.length > 0
          ? settings.groups
          : current.groups,
    };
    safeSet(key("facility_settings"), merged);
  },

  resetSystem() {
    if (confirm("ACHTUNG: Reset?")) {
      localStorage.clear();
      window.location.reload();
    }
  },
};