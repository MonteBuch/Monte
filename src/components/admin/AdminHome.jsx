// src/components/admin/AdminHome.jsx
import React from "react";
import {
  UsersRound,
  UserSquare,
  Cog,
  FolderOpen,
  Link2,
  Mail,
} from "lucide-react";
import ProfileSection from "../profile/ProfileSection";

export default function AdminHome({ onNavigate }) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-stone-800">
        Admin-Bereich
      </h2>

      {/* Benutzerverwaltung */}
      <ProfileSection
        icon={<UsersRound size={20} />}
        title="Benutzerverwaltung"
        subtitle="Eltern, Team & Admins verwalten"
        onClick={() => onNavigate("users")}
      />

      {/* Einladungslinks (NEU - empfohlen) */}
      <ProfileSection
        icon={<Link2 size={20} />}
        title="Einladungslinks"
        subtitle="Sichere Einmal-Links erstellen"
        onClick={() => onNavigate("invites")}
      />

      {/* Email-Verzeichnis */}
      <ProfileSection
        icon={<Mail size={20} />}
        title="Email-Verzeichnis"
        subtitle="Eltern-Emails für Benachrichtigungen"
        onClick={() => onNavigate("emails")}
      />

      {/* Einrichtungsinfos */}
      <ProfileSection
        icon={<Cog size={20} />}
        title="Einrichtungsinformationen"
        subtitle="Adresse, Kontakt, Öffnungszeiten"
        onClick={() => onNavigate("facility")}
      />

      {/* Gruppenverwaltung */}
      <ProfileSection
        icon={<UserSquare size={20} />}
        title="Gruppenverwaltung"
        subtitle="Gruppen & Strukturen verwalten"
        onClick={() => onNavigate("groups")}
      />

      {/* System-Tools */}
      <ProfileSection
        icon={<FolderOpen size={20} />}
        title="System-Tools"
        subtitle="Export, Reset & Einstellungen"
        onClick={() => onNavigate("system")}
      />
    </div>
  );
}