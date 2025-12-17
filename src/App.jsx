// src/App.jsx
import React, { useEffect, useState } from "react";
import {
  Home,
  Users,
  UtensilsCrossed,
  CalendarDays,
  User as UserIcon,
  Settings as SettingsIcon,
  Loader2,
  Cake,
} from "lucide-react";

import { supabase } from "./api/supabaseClient";

import AuthScreen from "./components/auth/AuthScreen";
import ForceReset from "./components/auth/ForceReset";

import News from "./components/news/News";
import GroupArea from "./components/group/GroupArea";
import FoodPlan from "./components/food/FoodPlan";

import AbsenceReport from "./components/absence/AbsenceReport";
import AbsenceTeamWrapper from "./components/absence/AbsenceTeamWrapper";
import AdminAbsenceDashboard from "./components/absence/AdminAbsenceDashboard";

import ProfileHome from "./components/profile/ProfileHome";
import ProfileChildren from "./components/profile/ProfileChildren";
import ProfileNotifications from "./components/profile/ProfileNotifications";
import ProfileFacility from "./components/profile/ProfileFacility";
import ProfileSecurity from "./components/profile/ProfileSecurity";

import AdminArea from "./components/admin/AdminArea";
import ErrorBoundary from "./components/ErrorBoundary";
import { hasTodayBirthdaysForUser } from "./lib/notificationTriggers";

// --------------------------------------------------
// Hilfs-Komponenten: Header & Footer
// --------------------------------------------------

const AppHeader = ({ user }) => {
  if (!user) return null;

  const displayName = user.name || user.username || "";
  let roleLabel = null;

  if (user.role === "team") roleLabel = "Team";
  if (user.role === "admin") roleLabel = "Leitung";

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-stone-200">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* kleines „Montessori“-Logo: 4 stilisierte Figuren */}
          <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center">
            <div className="flex gap-[2px] -translate-y-[1px]">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-stone-900">
              Montessori Kinderhaus
            </p>
            {displayName && (
              <p className="text-xs text-stone-500 truncate max-w-[200px]">
                {displayName}
              </p>
            )}
          </div>
        </div>

        {roleLabel && (
          <span className="px-3 py-1 rounded-full bg-black text-xs text-white font-semibold">
            {roleLabel}
          </span>
        )}
      </div>
    </header>
  );
};

const NavButton = ({ icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={
      "flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-colors " +
      (active ? "text-amber-600" : "text-stone-500 hover:text-stone-700")
    }
  >
    <div className="w-6 h-6 flex items-center justify-center relative">
      {icon}
      {badge && (
        <div className="absolute -top-1 -right-3 bg-amber-500 text-white rounded-full p-0.5">
          {badge}
        </div>
      )}
    </div>
    <span className="text-[11px] font-medium">{label}</span>
  </button>
);

const AppFooter = ({ activeTab, setActiveTab, isAdmin, hasBirthdays }) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200">
      <div className="max-w-4xl mx-auto px-2">
        <div className="flex justify-between">
          <NavButton
            icon={<Home size={20} />}
            label="News"
            active={activeTab === "news"}
            onClick={() => setActiveTab("news")}
          />
          <NavButton
            icon={<Users size={20} />}
            label="Gruppe"
            active={activeTab === "group"}
            onClick={() => setActiveTab("group")}
            badge={hasBirthdays ? <Cake size={10} /> : null}
          />
          <NavButton
            icon={<UtensilsCrossed size={20} />}
            label="Essen"
            active={activeTab === "food"}
            onClick={() => setActiveTab("food")}
          />
          <NavButton
            icon={<CalendarDays size={20} />}
            label="Meldungen"
            active={activeTab === "absence"}
            onClick={() => setActiveTab("absence")}
          />
          <NavButton
            icon={<UserIcon size={20} />}
            label="Profil"
            active={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
          />
          {isAdmin && (
            <NavButton
              icon={<SettingsIcon size={20} />}
              label="Admin"
              active={activeTab === "admin"}
              onClick={() => setActiveTab("admin")}
            />
          )}
        </div>
      </div>
    </footer>
  );
};

// --------------------------------------------------
// Haupt-App
// --------------------------------------------------

// User-Profil aus Supabase laden
async function loadUserProfile(userId) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      primary_group,
      facility_id,
      must_reset_password,
      children (
        id,
        first_name,
        birthday,
        notes,
        group_id
      )
    `)
    .eq("id", userId)
    .single();

  if (error) throw error;

  // Format für App (Kompatibilität mit bestehendem Code)
  return {
    id: profile.id,
    name: profile.full_name,
    role: profile.role,
    primaryGroup: profile.primary_group,
    facilityId: profile.facility_id,
    mustResetPassword: profile.must_reset_password || false,
    children: (profile.children || []).map(c => ({
      id: c.id,
      name: c.first_name,
      group: c.group_id,
      birthday: c.birthday,
      notes: c.notes,
    })),
  };
}

export default function App() {
  const [user, setUser] = useState(null);
  const [pendingResetUser, setPendingResetUser] = useState(null);
  const [activeTab, setActiveTab] = useState("news");
  const [loading, setLoading] = useState(true);
  // Unteransicht im Profil-Tab: home | children | notifications | facility | security
  const [profileView, setProfileView] = useState("home");
  // Geburtstags-Badge für Team-User
  const [hasBirthdays, setHasBirthdays] = useState(false);

  // Session beim Start wiederherstellen via Supabase Auth
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      console.log("[App] initSession gestartet");
      console.log("[App] Supabase Client vorhanden:", !!supabase);
      console.log("[App] Supabase Auth vorhanden:", !!supabase?.auth);

      // Debug: Zeige gespeicherte Supabase-Daten in localStorage
      const supabaseStorageKey = "sb-izpjmvgtrwxjmucebfyy-auth-token";
      const storedSession = localStorage.getItem(supabaseStorageKey);
      console.log("[App] Gespeicherte Session vorhanden:", !!storedSession);

      // Netzwerk-Test: Ist Supabase erreichbar?
      try {
        console.log("[App] Teste Supabase-Verbindung...");
        const testResponse = await fetch("https://izpjmvgtrwxjmucebfyy.supabase.co/rest/v1/", {
          method: "HEAD",
          headers: { "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cGptdmd0cnd4am11Y2ViZnl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzk3NjksImV4cCI6MjA4MDk1NTc2OX0.r9mcolZ5zCMmwjIO3mStZot8YUId_lbxjrvlfxJ_k3s" }
        });
        console.log("[App] Supabase erreichbar:", testResponse.ok, "Status:", testResponse.status);
      } catch (networkError) {
        console.error("[App] Supabase NICHT erreichbar:", networkError.message);
      }

      try {
        console.log("[App] Rufe getSession auf...");

        // Timeout für getSession (5 Sekunden)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("getSession timeout")), 5000)
        );

        console.log("[App] Promise.race startet...");
        const sessionPromise = supabase.auth.getSession();
        console.log("[App] getSession Promise erstellt:", !!sessionPromise);

        const result = await Promise.race([sessionPromise, timeoutPromise]);
        console.log("[App] Promise.race abgeschlossen");
        const { data: { session }, error: sessionError } = result;

        console.log("[App] getSession Ergebnis:", { session: !!session, error: sessionError });

        if (session?.user && mounted) {
          console.log("[App] Session gefunden, lade Profil für User:", session.user.id);
          try {
            const userData = await loadUserProfile(session.user.id);
            console.log("[App] Profil geladen:", userData);

            // Prüfen ob Passwort-Reset erforderlich
            if (userData.mustResetPassword) {
              setPendingResetUser(userData);
            } else {
              setUser(userData);
            }
          } catch (profileError) {
            console.error("[App] Profil laden fehlgeschlagen:", profileError);
            // Bei Profil-Fehler: Session löschen und Login zeigen
            await supabase.auth.signOut();
          }
        } else {
          console.log("[App] Keine Session gefunden");
        }
      } catch (e) {
        console.error("[App] Session restore failed", e);

        // Bei Timeout: Gespeicherte Session löschen und nochmal versuchen
        if (e.message === "getSession timeout" && storedSession) {
          console.log("[App] Timeout - lösche korrupte Session und versuche erneut...");
          localStorage.removeItem(supabaseStorageKey);

          // Zweiter Versuch ohne gespeicherte Session
          try {
            const { data: { session } } = await supabase.auth.getSession();
            console.log("[App] Zweiter Versuch erfolgreich:", !!session);
          } catch (retryError) {
            console.error("[App] Zweiter Versuch fehlgeschlagen:", retryError);
          }
        }
      } finally {
        console.log("[App] initSession beendet, setze loading=false");
        if (mounted) setLoading(false);
      }
    }

    initSession();

    // Auth-State-Listener für automatische Updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          setUser(null);
          setPendingResetUser(null);
        } else if (event === "SIGNED_IN" && session?.user) {
          try {
            const userData = await loadUserProfile(session.user.id);

            // Prüfen ob Passwort-Reset erforderlich
            if (userData.mustResetPassword) {
              setPendingResetUser(userData);
              setUser(null);
            } else {
              setUser(userData);
              setPendingResetUser(null);
            }
          } catch (e) {
            console.error("Profil laden fehlgeschlagen", e);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Event aus Profil („Adminbereich öffnen“)
  useEffect(() => {
    const handler = () => setActiveTab("admin");
    window.addEventListener("openAdminViaSettings", handler);
    return () => window.removeEventListener("openAdminViaSettings", handler);
  }, []);

  // Profil-Unterseite zurücksetzen, wenn man Tab wechselt
  useEffect(() => {
    if (activeTab !== "profile" && profileView !== "home") {
      setProfileView("home");
    }
  }, [activeTab, profileView]);

  // Geburtstage laden für Team-User (Badge in Navigation)
  useEffect(() => {
    if (!user || user.role !== "team") {
      setHasBirthdays(false);
      return;
    }

    async function checkBirthdays() {
      try {
        const hasBdays = await hasTodayBirthdaysForUser(user);
        setHasBirthdays(hasBdays);
      } catch (err) {
        console.error("Geburtstags-Check fehlgeschlagen:", err);
        setHasBirthdays(false);
      }
    }

    checkBirthdays();
  }, [user]);

  const handleLogin = (loggedInUser) => {
    // Session wird von Supabase Auth gemanaged
    // Hier nur State setzen für sofortige UI-Reaktion
    if (loggedInUser.mustResetPassword) {
      setPendingResetUser(loggedInUser);
      setUser(null);
    } else {
      setUser(loggedInUser);
      setPendingResetUser(null);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Logout failed", e);
    }
    setUser(null);
    setPendingResetUser(null);
  };

  const handlePasswordUpdated = (updatedUser) => {
    setPendingResetUser(null);
    setUser(updatedUser);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  // Konto löschen: User aus Supabase löschen und abmelden
  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      // Kinder löschen
      await supabase.from("children").delete().eq("user_id", user.id);
      // Profil löschen
      await supabase.from("profiles").delete().eq("id", user.id);
      // Auth-User kann nur von Supabase Admin API gelöscht werden
      // Für Self-Delete: Logout genügt, Auth-User bleibt (kann später Admin löschen)
      await handleLogout();
    } catch (e) {
      console.error("Account löschen fehlgeschlagen", e);
    }
  };

  // ------------------------------------------
  // Auth-Flows
  // ------------------------------------------

  // Loading-State während Session geladen wird
  if (loading) {
    return (
      <div className="h-screen bg-[#fcfaf7] flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={40} />
      </div>
    );
  }

  if (!user && pendingResetUser) {
    return (
      <ForceReset
        user={pendingResetUser}
        onPasswordUpdated={handlePasswordUpdated}
      />
    );
  }

  if (!user && !pendingResetUser) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  const isAdmin = user.role === "admin";

  // ------------------------------------------
  // Inhalt für Profil-Tab
  // ------------------------------------------

  const renderProfileContent = () => {
    switch (profileView) {
      case "children":
        return (
          <ProfileChildren
            user={user}
            isTeam={user.role === "team"}
            onBack={() => setProfileView("home")}
            onUpdateUser={handleUserUpdate}
          />
        );
      case "notifications":
        return (
          <ProfileNotifications
            user={user}
            onBack={() => setProfileView("home")}
          />
        );
      case "facility":
        return (
          <ProfileFacility
            user={user}
            onBack={() => setProfileView("home")}
          />
        );
      case "security":
        return (
          <ProfileSecurity
            user={user}
            onBack={() => setProfileView("home")}
            onUpdateUser={handleUserUpdate}
            onDeleteAccount={handleDeleteAccount}
          />
        );
      default:
        return (
          <ProfileHome
            user={user}
            onNavigate={setProfileView}
            onLogout={handleLogout}
          />
        );
    }
  };

  // ------------------------------------------
  // Haupt-Inhalt per Tab
  // ------------------------------------------

  let mainContent = null;

  if (activeTab === "news") {
    mainContent = <News user={user} />;
  } else if (activeTab === "group") {
    mainContent = <GroupArea user={user} />;
  } else if (activeTab === "food") {
    // Team- und Admin-Nutzer dürfen den Speiseplan bearbeiten.
    mainContent = (
      <FoodPlan
        isAdmin={user.role === "admin" || user.role === "team"}
      />
    );
  } else if (activeTab === "absence") {
    if (user.role === "team") {
      mainContent = <AbsenceTeamWrapper user={user} />;
    } else if (user.role === "admin") {
      mainContent = <AdminAbsenceDashboard user={user} />;
    } else {
      mainContent = <AbsenceReport user={user} />;
    }
  } else if (activeTab === "profile") {
    mainContent = renderProfileContent();
  } else if (activeTab === "admin" && isAdmin) {
    mainContent = <AdminArea user={user} />;
  } else {
    mainContent = (
      <div className="p-4 text-sm text-stone-500">Unbekannter Tab.</div>
    );
  }

  // ------------------------------------------
  // Layout: Header – Content – Footer
  // ------------------------------------------

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfaf7]">
      <AppHeader user={user} />

      <main className="flex-1 overflow-y-auto pt-20 pb-20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <ErrorBoundary>{mainContent}</ErrorBoundary>
        </div>
      </main>

      <AppFooter
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
        hasBirthdays={hasBirthdays}
      />
    </div>
  );
}