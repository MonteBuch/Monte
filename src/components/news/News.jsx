// src/components/news/News.jsx
import React, { useEffect, useMemo, useState } from "react";
import { StorageService } from "../../lib/storage";
import NewsCreate from "./NewsCreate";
import NewsFeed from "./NewsFeed";

export default function News({ user }) {
  const [allNews, setAllNews] = useState([]);

  // Gruppen aus Storage laden
  const groups = StorageService.getGroups();

  const [hiddenNewsIds, setHiddenNewsIds] = useState(() => {
    return StorageService.get(`news_hidden_${user.username}`) || [];
  });

  const [selectedGroupId, setSelectedGroupId] = useState(() => {
    if (user.role === "team" && user.primaryGroup) {
      return user.primaryGroup;
    }
    return "all";
  });

  useEffect(() => {
    const loaded = StorageService.get("news") || [];
    const migrated = loaded.map((n) => {
      let groupId = n.groupId;
      if (!groupId && n.group) groupId = n.group;
      let target = n.target;
      if (!target) target = groupId ? "group" : "all";
      return { ...n, groupId: groupId || null, target };
    });

    migrated.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    setAllNews(migrated);
  }, []);

  const handleAddNews = (item) => {
    const updated = [item, ...allNews];
    setAllNews(updated);
    StorageService.set("news", updated);
  };

  const handleGroupChange = (id) => setSelectedGroupId(id || "all");

  const handleHideNews = (id) => {
    const updated = [...hiddenNewsIds, id];
    setHiddenNewsIds(updated);
    StorageService.set(`news_hidden_${user.username}`, updated);
  };

  const visibleByRole = useMemo(() => {
    if (!allNews.length) return [];
    if (user.role === "parent") {
      const childGroups = Array.from(
        new Set((user.children || []).map((c) => c.group).filter(Boolean))
      );
      return allNews.filter((n) => {
        if (!n.groupId) return true;
        if (!childGroups.length) return false;
        return childGroups.includes(n.groupId);
      });
    }
    return allNews;
  }, [allNews, user]);

  const filteredNews = useMemo(() => {
    const base = visibleByRole.filter((n) => !hiddenNewsIds.includes(n.id));
    if (selectedGroupId === "all" || user.role === "parent") {
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
            Wichtige Infos aus dem Kinderhaus.
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
    </div>
  );
}