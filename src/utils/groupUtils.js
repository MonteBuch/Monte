// src/utils/groupUtils.js
// ------------------------------------------------------------
// Zentrale Gruppen- und Farblogik für die gesamte App
// ------------------------------------------------------------

import {
  Globe,
  Droplets,
  Flame,
  Sun,
  Flower2,
  Wind,
  Cloud,
  Leaf,
  TreePine,
  Mountain,
  Snowflake,
  MoonStar,
  Palette,
  Brush,
  Blocks,
  Puzzle,
  Music4,
  Baby,
  Smile,
  UsersRound,
  BookOpen,
  Star,
  Clover,
  Sprout,
} from "lucide-react";

// 1. ICON-POOL
export const ICON_POOL = {
  globe: Globe,
  droplets: Droplets,
  flame: Flame,
  sun: Sun,
  flower2: Flower2,
  wind: Wind,
  cloud: Cloud,
  leaf: Leaf,
  "tree-pine": TreePine,
  mountain: Mountain,
  snowflake: Snowflake,
  "moon-star": MoonStar,
  palette: Palette,
  brush: Brush,
  blocks: Blocks,
  puzzle: Puzzle,
  "music-4": Music4,
  baby: Baby,
  smile: Smile,
  "users-round": UsersRound,
  "book-open": BookOpen,
  star: Star,
  clover: Clover,
  // Legacy / Fallbacks
  sprout: Sprout,
  water: Droplets,
  tree: TreePine,
};

export const DEFAULT_ICON = Star;

// 2. TAILWIND 500 → HSL-MAPPING
const TAILWIND_500_HSL = {
  red:      { h: 0,   s: 72,  l: 51 },
  rose:     { h: 350, s: 89,  l: 60 },
  orange:   { h: 24,  s: 94,  l: 50 },
  amber:    { h: 38,  s: 92,  l: 50 },
  yellow:   { h: 54,  s: 100, l: 62 },
  lime:     { h: 90,  s: 80,  l: 52 },
  green:    { h: 142, s: 71,  l: 45 },
  emerald:  { h: 152, s: 66,  l: 41 },
  teal:     { h: 174, s: 72,  l: 40 },
  cyan:     { h: 187, s: 85,  l: 45 },
  sky:      { h: 204, s: 94,  l: 55 },
  blue:     { h: 217, s: 89,  l: 50 },
  indigo:   { h: 244, s: 75,  l: 60 },
  violet:   { h: 262, s: 83,  l: 58 },
  purple:   { h: 271, s: 52,  l: 45 },
  fuchsia:  { h: 292, s: 84,  l: 60 },
  pink:     { h: 330, s: 81,  l: 60 },
  stone:    { h: 25,  s: 14,  l: 47 },
  gray:     { h: 218, s: 11,  l: 65 },
  slate:    { h: 215, s: 20,  l: 50 },
  neutral:  { h: 0,   s: 0,   l: 50 },
};

// 3. Parser
export function parseTailwindColor(twClass) {
  if (!twClass) return null;
  const match = twClass.match(/bg-([a-z]+)-[0-9]{3}/);
  if (!match) return null;
  const name = match[1];
  return TAILWIND_500_HSL[name] || null;
}

// 4. Header-Farbe ableiten
export function deriveHeaderColor({ h, s, l }) {
  const newL = Math.min(96, l + 42); 
  const newS = Math.max(30, s - 20);
  return `hsl(${h}, ${newS}%, ${newL}%)`;
}

// 5. Tailwind-Näherung
const TAILWIND_LIGHTNESS = {
  50:  97,
  100: 94,
  200: 86,
  300: 77,
};

export function approximateTailwindClass(colorName, targetHSL) {
  if (!targetHSL || !colorName) return "bg-gray-100";
  const match = targetHSL.match(/(\d+)%\)$/);
  const desiredL = match ? parseInt(match[1], 10) : 95;
  let best = "50";
  let smallestDiff = Infinity;
  for (const [shade, lightness] of Object.entries(TAILWIND_LIGHTNESS)) {
    const diff = Math.abs(lightness - desiredL);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      best = shade;
    }
  }
  return `bg-${colorName}-${best}`;
}

// 6. Styles holen
export function getGroupStyles(group) {
  if (!group) {
    return {
      id: "unknown",
      name: "Unbekannt",
      chipClass: "bg-slate-500 text-white",
      headerApproxClass: "bg-slate-100",
      headerExact: "hsl(215,20%,94%)",
      Icon: DEFAULT_ICON,
    };
  }

  let chipClass = group.color || "bg-slate-500";
  if (!chipClass.includes("text-")) {
    chipClass += " text-white";
  }

  const IconComponent = ICON_POOL[group.icon] || DEFAULT_ICON;
  const hsl = parseTailwindColor(chipClass);
  let headerExact = "hsl(0, 0%, 95%)"; 
  let headerApproxClass = "bg-stone-100";

  if (hsl) {
    headerExact = deriveHeaderColor(hsl);
    const colorName = chipClass.match(/bg-([a-z]+)-/)?.[1];
    headerApproxClass = approximateTailwindClass(colorName, headerExact);
  }

  return {
    id: group.id,
    name: group.name,
    chipClass,
    headerApproxClass,
    headerExact,
    Icon: IconComponent,
  };
}

// 7. Helper
export function getGroupById(groups, id) {
  if (!groups || !Array.isArray(groups)) return null;
  if (!id || id === "all") return null;
  return groups.find((g) => g.id === id) || null;
}