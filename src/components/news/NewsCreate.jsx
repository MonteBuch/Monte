// src/components/news/NewsCreate.jsx
import React, { useMemo, useState } from "react";
import {
  Send,
  Megaphone,
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
} from "lucide-react";
import { StorageService } from "../../lib/storage";

/**
 * NewsCreate – Eingabeformular für neue Mitteilungen.
 * • Farbiger Header mit Gruppenauswahl
 * • Dynamischer Button-Text („Mitteilung an … senden“)
 * • Korrekte Icons und Gruppennamen
 */
export default function NewsCreate({ user, groups, onSubmit }) {
  // Facility‑Gruppen laden (falls keine übergeben)
  const facilityGroups =
    Array.isArray(groups) && groups.length > 0
      ? groups
      : StorageService.getDefaultGroups();

  // Standardziel: Team → eigene Stammgruppe, Admin → „Alle“
  const initialTarget = useMemo(() => {
    if (user.role === "team" && user.primaryGroup) {
      return user.primaryGroup;
    }
    return "all";
  }, [user]);

  const [text, setText] = useState("");
  const [target, setTarget] = useState(initialTarget);

  // Nachrichtenobjekt zusammenstellen und übergeben
  const handleSubmit = () => {
    if (!text.trim()) return;
    const item = {
      id: crypto.randomUUID(),
      text: text.trim(),
      createdBy: user.username,
      groupId: target === "all" ? null : target,
      target,
      date: new Date().toISOString(),
    };
    onSubmit(item);
    setText("");
    setTarget(initialTarget);
  };

  /**
   * Wandelt einen gespeicherten Icon-Namen (z. B. "flame") in das passende
   * Lucide-Icon um. Für standardmäßige Gruppen wird das React-Element
   * unverändert übernommen.
   */
  const resolveIcon = (icon) => {
    if (React.isValidElement(icon)) return icon;
    const map = {
      globe: <Globe size={16} />,
      droplets: <Droplets size={16} />,
      flame: <Flame size={16} />,
      sun: <Sun size={16} />,
      flower2: <Flower2 size={16} />,
      wind: <Wind size={16} />,
      cloud: <Cloud size={16} />,
      leaf: <Leaf size={16} />,
      "tree-pine": <TreePine size={16} />,
      mountain: <Mountain size={16} />,
      snowflake: <Snowflake size={16} />,
      "moon-star": <MoonStar size={16} />,
      palette: <Palette size={16} />,
      brush: <Brush size={16} />,
      blocks: <Blocks size={16} />,
      puzzle: <Puzzle size={16} />,
      "music-4": <Music4 size={16} />,
      baby: <Baby size={16} />,
      smile: <Smile size={16} />,
      "users-round": <UsersRound size={16} />,
      "book-open": <BookOpen size={16} />,
      star: <Star size={16} />,
      clover: <Clover size={16} />,
    };
    return map[icon] || <Megaphone size={16} />;
  };

  /**
   * Ermittelt eine helle Hintergrundfarbe + Textfarbe aus der Gruppenfarbe.
   * Für Standardgruppen wird `light` verwendet, für dynamische Farben (z. B. bg-red-500)
   * wird automatisch eine 50er-Nuance und der passende Textton gewählt.
   */
  const computeLight = (group) => {
    if (!group) return "bg-stone-100 text-stone-800";
    if (group.light) return group.light;
    const colorClass = group.color || "";
    const parts = colorClass.split(" ");
    const bg = parts.find((c) => c.startsWith("bg-"));
    if (!bg || bg.includes("[#")) return "bg-stone-100 text-stone-800";
    const comps = bg.split("-");
    if (comps.length < 3) return "bg-stone-100 text-stone-800";
    const colorName = comps[1];
    return `bg-${colorName}-50 text-${colorName}-800`;
  };

  // Aktuell ausgewählte Gruppe
  const selectedGroup =
    target !== "all"
      ? facilityGroups.find((g) => g.id === target)
      : null;

  // Farben & Icon für den Header (abhängig von Gruppe)
  const headerBg = selectedGroup
    ? computeLight(selectedGroup)
    : "bg-stone-100 text-stone-800";
  const iconBg = selectedGroup
    ? selectedGroup.color
    : "bg-stone-200 text-stone-700";
  const headerIcon = selectedGroup
    ? resolveIcon(selectedGroup.icon)
    : <Megaphone size={16} />;
  const targetLabel =
    target === "all"
      ? "Alle"
      : selectedGroup
      ? selectedGroup.name
      : "Alle";

  return (
    <div className="space-y-4">
      {/* Farbiger Header mit Icon und Gruppenauswahl */}
      <div className={`p-5 rounded-3xl border shadow-sm ${headerBg}`}>
        <div className="flex items-center gap-3">
          {/* Kreis mit Haupt-Icon */}
          <div className={`${iconBg} p-2 rounded-2xl shadow`}>
            {headerIcon}
          </div>
          <div>
            <h3 className="text-lg font-bold">News</h3>
            <p className="text-xs">
              Neue Mitteilung an Eltern senden
            </p>
          </div>
        </div>

        {/* Gruppenwahl: Alle + Gruppenchips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {/* Chip „Alle“ */}
          <button
            type="button"
            onClick={() => setTarget("all")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              target === "all"
                ? "bg-stone-800 text-white border-stone-900"
                : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
            }`}
          >
            Alle
          </button>

          {/* Gruppenchips mit korrektem Icon */}
          {facilityGroups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setTarget(g.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                target === g.id
                  ? `${g.color} border-transparent`
                  : "bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100"
              }`}
            >
              {resolveIcon(g.icon)}
              <span>{g.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Textfeld */}
      <div className="space-y-1">
        <label className="text-xs uppercase text-stone-500 font-semibold">
          Mitteilung
        </label>
        <textarea
          className="w-full p-3 rounded-xl bg-stone-50 border border-stone-300 text-sm resize-none"
          placeholder="Kurze Info für Eltern oder Team..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
        />
      </div>

      {/* Senden-Button mit dynamischem Text */}
      <button
        type="button"
        onClick={handleSubmit}
        className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 active:scale-95 flex items-center justify-center gap-2 text-sm"
      >
        <Send size={18} />
        {`Mitteilung an ${targetLabel} senden`}
      </button>
    </div>
  );
}