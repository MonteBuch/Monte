// src/lib/constants.jsx
import {
  Sprout,
  Sun,
  Flame,
  Droplets,
  Flower2,
  Leaf,
} from "lucide-react";

// Standardcodes (können im Adminbereich überschrieben werden)
export const DEFAULT_PARENT_CODE = "PARENT-2024";
export const DEFAULT_TEAM_CODE = "TEAM-2024";
export const DEFAULT_ADMIN_CODE = "ADMIN-2024";

export const GROUPS = [
   {
    id: "event",
    name: "Event",
    color: "bg-stone-300 text-stone-800",
    icon: "rainbow",
    special: "event"
  },
  {
    id: "erde",
    name: "Erde",
    color: "bg-[#795C34] text-white",      // Peanut-Braun (bleibt)
    light: "bg-[#DEC6A1] text-stone-800",  // warmes, erdiges Pastell
    icon: <Leaf size={16} />,
  },
  {
    id: "sonne",
    name: "Sonne",
    color: "bg-yellow-500 text-white",
    light: "bg-yellow-100 text-yellow-800",  // heller, aber klar Sonne
    icon: <Sun size={16} />,
  },
  {
    id: "feuer",
    name: "Feuer",
    color: "bg-red-500 text-white",
    light: "bg-red-100 text-red-800",        // weiches Feuer-Pastell
    icon: <Flame size={16} />,
  },
  {
    id: "wasser",
    name: "Wasser",
    color: "bg-blue-500 text-white",
    light: "bg-blue-100 text-blue-800",     // klares Wasser-Pastell
    icon: <Droplets size={16} />,
  },
  {
    id: "blume",
    name: "Blume",
    color: "bg-pink-500 text-white",
    light: "bg-pink-100 text-pink-800",     // sanftes Florales Pastell
    icon: <Flower2 size={16} />,
  },
];