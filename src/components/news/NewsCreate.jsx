// src/components/news/NewsCreate.jsx

import React, { useState } from "react";
import {
  Send,
  Paperclip,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Trash2,
  Megaphone,
  List as ListIcon,
  ListOrdered,
  Image as ImageIcon,
  Minus as MinusIcon,
  Type as TypeIcon,
} from "lucide-react";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { Mark } from "@tiptap/core";

import { getGroupStyles } from "../../utils/groupUtils";

//
// ⭐ INLINE CUSTOM UNDERLINE – vorhandene Logik aus deiner alten Datei!
//
const CustomUnderline = Mark.create({
  name: "customUnderline",

  parseHTML() {
    return [{ tag: "u" }, { style: "text-decoration", consuming: false }];
  },

  renderHTML() {
    return ["u", {}, 0];
  },

  addCommands() {
    return {
      toggleCustomUnderline:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
    };
  },
});

export default function NewsCreate({
  user,
  groups,
  selectedGroupId,
  onGroupChange,
  onSubmit,
}) {
  const [attachments, setAttachments] = useState([]);

  const effectiveTarget =
    selectedGroupId ?? (user.role === "team" && user.primaryGroup) ?? "all";

  const selectedGroup =
    effectiveTarget !== "all"
      ? groups.find((g) => g.id === effectiveTarget)
      : null;

  // Styles
  const styles = getGroupStyles(selectedGroup);
  const iconBg = selectedGroup
    ? styles.chipClass
    : "bg-stone-200 text-stone-700";

  const targetLabel =
    effectiveTarget === "all"
      ? "Alle"
      : selectedGroup
      ? selectedGroup.name
      : "Alle";

  const [refresh, setRefresh] = useState(0);

  //
  // TIPTAP EDITOR
  //
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
        link: {
          autolink: true,
          openOnClick: true,
        },
      }),
      CustomUnderline, // ⭐ wieder drin – exakt wie früher
      Image.configure({ inline: true }),
      Placeholder.configure({
        placeholder: "Kurze Info für Eltern oder Team...",
      }),
    ],
    content: "",
    onUpdate() {
      setRefresh((x) => x + 1);
    },
    onSelectionUpdate() {
      setRefresh((x) => x + 1);
    },
  });

  //
  // FORMAT COMMANDS
  //
  const applyFormat = (command) => {
    if (!editor) return;

    const chain = editor.chain().focus();

    switch (command) {
      case "bold":
        chain.toggleBold().run();
        break;
      case "italic":
        chain.toggleItalic().run();
        break;
      case "underline":
        chain.toggleCustomUnderline().run();
        break;
      case "bulletList":
        chain.toggleBulletList().run();
        break;
      case "orderedList":
        chain.toggleOrderedList().run();
        break;
      case "heading":
        if (editor.isActive("heading", { level: 2 })) {
          chain.setParagraph().run();
        } else {
          chain.setHeading({ level: 2 }).run();
        }
        break;
      case "hr":
        chain.setHorizontalRule().run();
        break;
      default:
        return;
    }
    setRefresh((x) => x + 1);
  };

  const isActive = (name, attrs = {}) =>
    editor ? editor.isActive(name, attrs) : false;

  //
  // IMAGE EMBED
  //
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  //
  // FILE ATTACHMENTS → werden später in Supabase hochgeladen
  //
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const mapped = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file, // wichtig für Supabase Storage
    }));

    setAttachments((prev) => [...prev, ...mapped]);
    e.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  //
  // SUBMIT
  //
  const handleSubmit = () => {
    if (!editor) return;

    const html = editor.getHTML();
    const plain = editor.getText().trim();
    if (!plain) return;

    const newItem = {
      id: crypto.randomUUID(),
      text: html,
      date: new Date().toISOString(),
      groupId: effectiveTarget === "all" ? null : effectiveTarget,
      target: effectiveTarget === "all" ? "all" : "group",
      attachments,
      createdBy: user.id,
    };

    onSubmit(newItem);

    editor.commands.setContent("");
    setAttachments([]);
  };

  //
  // UI – unverändert
  //
  return (
    <div className="space-y-4">

      {/* HEADER */}
      <div
        className="p-5 rounded-3xl border shadow-sm text-stone-800 transition-colors duration-300"
        style={{ backgroundColor: styles.headerColor }}
      >
        <div className="flex items-center gap-3">
          <div className={`${iconBg} p-2 rounded-2xl shadow transition-colors duration-300`}>
            <styles.Icon size={18} />
          </div>

          <div>
            <h3 className="text-lg font-bold">News</h3>
            <p className="text-xs opacity-80">Neue Mitteilung an Eltern senden</p>
          </div>
        </div>

        {/* Gruppenwahl */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => onGroupChange("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              effectiveTarget === "all"
                ? "bg-stone-800 text-white border-transparent"
                : "bg-white/50 text-stone-600 border-stone-300 hover:bg-white"
            }`}
          >
            Alle
          </button>

          {groups
            .filter((g) => !g.is_event_group)
            .map((g) => {
              const btnStyles = getGroupStyles(g);
              const isActive = effectiveTarget === g.id;

              return (
                <button
                  key={g.id}
                  onClick={() => onGroupChange(g.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1 transition-all ${
                    isActive
                      ? `${btnStyles.chipClass} border-transparent shadow-sm`
                      : "bg-white/50 text-stone-600 border-stone-300 hover:bg-white"
                  }`}
                >
                  {isActive && <btnStyles.Icon size={12} />}
                  {g.name}
                </button>
              );
            })}
        </div>
      </div>

      {/* EDITOR */}
      <div className="rounded-2xl border border-stone-300 bg-white overflow-hidden shadow-sm">
        {/* Toolbar */}
        {editor && (
          <div className="flex items-center gap-1 px-3 py-2 border-b bg-stone-50">
            <button onClick={() => applyFormat("bold")} className={`p-1.5 rounded-md hover:bg-stone-200 ${isActive("bold") ? "bg-stone-300" : ""}`}><Bold size={16} /></button>
            <button onClick={() => applyFormat("italic")} className={`p-1.5 rounded-md hover:bg-stone-200 ${isActive("italic") ? "bg-stone-300" : ""}`}><Italic size={16} /></button>
            <button onClick={() => applyFormat("underline")} className={`p-1.5 rounded-md hover:bg-stone-200 ${isActive("customUnderline") ? "bg-stone-300" : ""}`}><UnderlineIcon size={16} /></button>
            <span className="w-px h-5 bg-stone-300 mx-1" />
            <button onClick={() => applyFormat("bulletList")} className={`p-1.5 rounded-md hover:bg-stone-200 ${isActive("bulletList") ? "bg-stone-300" : ""}`}><ListIcon size={16} /></button>
            <button onClick={() => applyFormat("orderedList")} className={`p-1.5 rounded-md hover:bg-stone-200 ${isActive("orderedList") ? "bg-stone-300" : ""}`}><ListOrdered size={16} /></button>
            <button onClick={() => applyFormat("heading")} className={`p-1.5 rounded-md hover:bg-stone-200 ${isActive("heading", { level: 2 }) ? "bg-stone-300" : ""}`}><TypeIcon size={16} /></button>

            <label className="p-1.5 rounded-md hover:bg-stone-200 cursor-pointer">
              <ImageIcon size={16} />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
            </label>

            <button onClick={() => applyFormat("hr")} className="p-1.5 rounded-md hover:bg-stone-200">
              <MinusIcon size={16} />
            </button>

            <div className="flex-1" />

            <label className="p-1.5 rounded-md hover:bg-stone-200 cursor-pointer">
              <Paperclip size={16} />
              <input type="file" multiple className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        )}

        {/* EDITOR AREA */}
        <EditorContent
          editor={editor}
          className="ProseMirror min-h-[140px] px-3 py-2 focus:outline-none text-sm"
        />
      </div>

      {/* ATTACHMENTS */}
      {attachments.length > 0 && (
        <div className="space-y-1 text-xs">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-xl p-2"
            >
              <span className="truncate">{att.name}</span>
              <button
                onClick={() => removeAttachment(idx)}
                className="p-1 text-red-500 hover:text-red-700"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SEND */}
      <button
        onClick={handleSubmit}
        className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 active:scale-95 flex items-center justify-center gap-2 text-sm shadow-md transition-transform"
      >
        <Send size={18} />
        {`Mitteilung an ${targetLabel} senden`}
      </button>
    </div>
  );
}