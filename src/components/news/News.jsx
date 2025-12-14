// src/components/news/News.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import { fetchGroups } from "../../api/groupApi";
import { StorageService } from "../../lib/storage";

import NewsCreate from "./NewsCreate";
import NewsFeed from "./NewsFeed";

const NEWS_BUCKET = "news-attachments";

export default function News({ user }) {
  const [allNews, setAllNews] = useState([]);
  const [hiddenNewsIds, setHiddenNewsIds] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(() => {
    if (user.role === "team" && user.primaryGroup) return user.primaryGroup;
    return "all";
  });
  const [loading, setLoading] = useState(true);

  // Gruppen: Supabase → Fallback LocalStorage (wie GroupArea)
  useEffect(() => {
    let cancelled = false;

    async function loadGroups() {
      try {
        const supabaseGroups = await fetchGroups();
        if (!cancelled && Array.isArray(supabaseGroups) && supabaseGroups.length > 0) {
          setGroups(supabaseGroups);
          return;
        }
      } catch (e) {
        console.warn("Supabase Gruppen nicht verfügbar – Fallback auf LocalStorage", e);
      }

      const facility = StorageService.getFacilitySettings();
      const fallbackGroups = facility?.groups || [];
      if (!cancelled) setGroups(fallbackGroups);
    }

    loadGroups();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hilfsfunktion: News + Hidden aus Supabase laden
  const loadNews = async () => {
    setLoading(true);
    try {
      const { data: newsRows, error: newsError } = await supabase
        .from("news")
        .select("*")
        .order("date", { ascending: false });

      if (newsError) {
        console.error("Fehler beim Laden der News:", newsError);
        setAllNews([]);
      } else {
        const mapped = (newsRows || []).map((row) => ({
          id: row.id,
          text: row.text,
          date: row.date,
          groupId: row.group_id || null,
          target: row.target || (row.group_id ? "group" : "all"),
          attachments: Array.isArray(row.attachments) ? row.attachments : [],
          createdBy: row.created_by,
        }));
        setAllNews(mapped);
      }

      const { data: hiddenRows, error: hiddenError } = await supabase
        .from("news_hidden")
        .select("news_id")
        .eq("username", user.username);

      if (hiddenError) {
        console.error("Fehler beim Laden der versteckten News:", hiddenError);
        setHiddenNewsIds([]);
      } else {
        setHiddenNewsIds((hiddenRows || []).map((r) => r.news_id));
      }
    } catch (e) {
      console.error("Unerwarteter Fehler beim Laden der News:", e);
      setAllNews([]);
      setHiddenNewsIds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.username]);

  // Attachments in Supabase Storage hochladen und Metadaten zurückgeben
  const uploadAttachments = async (newsId, attachments) => {
    if (!attachments || !attachments.length) return [];

    const uploaded = [];

    for (const att of attachments) {
      // att.file kommt aus NewsCreate
      if (!att.file) continue;

      const path = `${user.username}/${newsId}/${att.name}`;

      const { error: uploadError } = await supabase.storage
        .from(NEWS_BUCKET)
        .upload(path, att.file, {
          upsert: true,
        });

      if (uploadError) {
        console.error("Fehler beim Upload eines Anhangs:", uploadError);
        continue;
      }

      const { data: publicData } = supabase.storage
        .from(NEWS_BUCKET)
        .getPublicUrl(path);

      const url = publicData?.publicUrl;
      if (!url) continue;

      uploaded.push({
        name: att.name,
        size: att.size,
        type: att.type,
        url,
      });
    }

    return uploaded;
  };

  // News anlegen: Attachments hochladen → Row in „news“ schreiben → State updaten
  const handleAddNews = async (draft) => {
    try {
      const newsId = draft.id || crypto.randomUUID();
      const uploadedAttachments = await uploadAttachments(newsId, draft.attachments || []);

      const payload = {
        id: newsId,
        text: draft.text,
        date: draft.date,
        group_id: draft.groupId || null,
        target: draft.target || (draft.groupId ? "group" : "all"),
        attachments: uploadedAttachments,
        created_by: draft.createdBy || user.username,
        facility_id: null, // optional, falls du später mehrere Einrichtungen trennst
      };

      const { data, error } = await supabase
        .from("news")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        console.error("Fehler beim Speichern der News:", error);
        return;
      }

      const mapped = {
        id: data.id,
        text: data.text,
        date: data.date,
        groupId: data.group_id || null,
        target: data.target || (data.group_id ? "group" : "all"),
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
        createdBy: data.created_by,
      };

      setAllNews((prev) => [mapped, ...prev]);
    } catch (e) {
      console.error("Unerwarteter Fehler beim Anlegen der News:", e);
    }
  };

  const handleGroupChange = (id) => setSelectedGroupId(id || "all");

  const handleHideNews = async (id) => {
    try {
      const payload = {
        id: crypto.randomUUID(),
        news_id: id,
        username: user.username,
      };

      const { error } = await supabase.from("news_hidden").insert(payload);
      if (error) {
        console.error("Fehler beim Verstecken der News:", error);
      }
    } catch (e) {
      console.error("Unerwarteter Fehler beim Verstecken der News:", e);
    }

    setHiddenNewsIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  };

  // Sichtweite nach Rolle (Eltern nur eigene Gruppen)
  const visibleByRole = useMemo(() => {
    if (!allNews.length) return [];

    if (user.role === "parent") {
      const childGroups = Array.from(
        new Set((user.children || []).map((c) => c.group).filter(Boolean))
      );
      return allNews.filter((n) => {
        if (!n.groupId) return true; // globale News
        if (!childGroups.length) return false;
        return childGroups.includes(n.groupId);
      });
    }

    // Team/Admin sehen alles
    return allNews;
  }, [allNews, user]);

  // Filter nach Gruppe (für Team/Admin) + Hidden
  const filteredNews = useMemo(() => {
    const base = visibleByRole.filter((n) => !hiddenNewsIds.includes(n.id));

    if (user.role === "parent" || selectedGroupId === "all") {
      return base;
    }

    return base.filter((n) => n.groupId === selectedGroupId);
  }, [visibleByRole, hiddenNewsIds, selectedGroupId, user.role]);

  return (
    <div className="space-y-6">
      {user.role === "parent" && (
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <h2 className="text-lg font-bold text-stone-800">News</h2>
          <p className="text-xs text-stone-500 mt-1">
            Wichtige Infos aus dem Kinderhaus. Du kannst einzelne Mitteilungen
            ausblenden, sie bleiben dann für dich verborgen.
          </p>
        </div>
      )}

      {(user.role === "team" || user.role === "admin") && (
        <NewsCreate
          user={user}
          groups={groups}
          selectedGroupId={selectedGroupId}
          onGroupChange={handleGroupChange}
          onSubmit={handleAddNews}
        />
      )}

      <NewsFeed
        user={user}
        news={filteredNews}
        groups={groups}
        onDelete={handleHideNews}
      />

      {loading && (
        <p className="text-xs text-stone-400 text-center">
          News werden geladen…
        </p>
      )}
    </div>
  );
}