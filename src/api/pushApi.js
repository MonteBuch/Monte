// src/api/pushApi.js
// API für Push-Benachrichtigungen via Edge Function

import { supabase } from "./supabaseClient";

/**
 * Generische Funktion zum Senden von Push-Benachrichtigungen
 * @param {string} title - Titel der Notification
 * @param {string} body - Body/Inhalt der Notification
 * @param {string} category - Kategorie (news, lists, absences, food)
 * @param {Object} options - Zusätzliche Optionen
 * @returns {Promise<{success: boolean, sentCount: number, error?: string}>}
 */
async function sendPushNotification(title, body, category, options = {}) {
  try {
    const response = await supabase.functions.invoke('send-push-notification', {
      body: {
        title,
        body,
        category,
        groupIds: options.groupIds || null,
        userIds: options.userIds || null,
        data: options.data || {},
      },
    });

    if (response.error) {
      console.error(`Push-Notification (${category}) Fehler:`, response.error);
      throw new Error(response.error.message || "Push-Notification Fehler");
    }

    const data = response.data;
    if (data && !data.success) {
      console.error(`Push-Notification (${category}) fehlgeschlagen:`, data);
      throw new Error(data.error || "Push-Notification fehlgeschlagen");
    }

    const sentCount = data?.sent || 0;
    console.log(`Push-Notifications (${category}) gesendet: ${sentCount}`);

    return { success: true, sentCount };
  } catch (error) {
    console.error(`Fehler beim Push-Versand (${category}):`, error);
    return { success: false, sentCount: 0, error: error.message };
  }
}

/**
 * Sendet Push-Benachrichtigungen für News
 * @param {Object} news - Die News-Daten
 * @param {string[]|null} groupIds - Array von Gruppen-IDs oder null für alle
 * @returns {Promise<{success: boolean, sentCount: number, error?: string}>}
 */
export async function sendNewsPushNotifications(news, groupIds) {
  try {
    // Titel für die Notification
    const title = news.title || extractTitleFromHtml(news.text);

    // Body: Kurze Vorschau des Inhalts
    const body = extractPreviewText(news.text, 100);

    // Edge Function aufrufen
    const response = await supabase.functions.invoke('send-push-notification', {
      body: {
        title: title || "Neue Mitteilung",
        body: body,
        category: "news",
        groupIds: groupIds && groupIds.length > 0 ? groupIds : null,
        data: {
          type: "news",
          newsId: news.id,
        },
      },
    });

    if (response.error) {
      console.error("Push-Notification Edge Function Fehler:", response.error);
      throw new Error(response.error.message || "Push-Notification Fehler");
    }

    const data = response.data;
    if (data && !data.success) {
      console.error("Push-Notification fehlgeschlagen:", data);
      throw new Error(data.error || "Push-Notification fehlgeschlagen");
    }

    const sentCount = data?.sent || 0;
    console.log(`Push-Notifications gesendet: ${sentCount}`);

    return {
      success: true,
      sentCount: sentCount,
    };

  } catch (error) {
    console.error("Fehler beim Push-Versand:", error);
    return {
      success: false,
      sentCount: 0,
      error: error.message,
    };
  }
}

/**
 * Extrahiert den Titel aus HTML-Content
 */
function extractTitleFromHtml(html) {
  // Versuche H2 zu finden
  const h2Match = html.match(/<h2[^>]*>(.*?)<\/h2>/i);
  if (h2Match) {
    return h2Match[1].replace(/<[^>]*>/g, '').trim();
  }

  // Fallback: Ersten Paragraph
  const pMatch = html.match(/<p[^>]*>(.*?)<\/p>/i);
  if (pMatch) {
    const text = pMatch[1].replace(/<[^>]*>/g, '').trim();
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
  }

  return null;
}

/**
 * Extrahiert eine Vorschau aus HTML-Content
 */
function extractPreviewText(html, maxLength = 100) {
  // HTML-Tags entfernen
  const plainText = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return plainText.substring(0, maxLength).trim() + '...';
}

/**
 * Sendet Push-Benachrichtigungen für neue Listen/Abstimmungen
 * Zielgruppe: Eltern der betroffenen Gruppe
 * @param {Object} list - Die Listen-Daten (title, type, group_id)
 * @param {string} groupId - Die Gruppen-ID
 * @param {string} groupName - Der Gruppenname für die Anzeige
 * @returns {Promise<{success: boolean, sentCount: number, error?: string}>}
 */
export async function sendListPushNotifications(list, groupId, groupName) {
  const typeLabels = {
    bring: "Mitbringliste",
    duty: "Dienstplan",
    poll: "Abstimmung",
  };

  const typeLabel = typeLabels[list.type] || "Liste";
  const title = `Neue ${typeLabel}`;
  const body = groupName
    ? `${list.title} (${groupName})`
    : list.title;

  return sendPushNotification(title, body, "lists", {
    groupIds: [groupId],
    data: { type: "list", listId: list.id },
  });
}

/**
 * Sendet Push-Benachrichtigungen für Abwesenheitsmeldungen
 * Zielgruppe: Team-Mitglieder der betroffenen Gruppe
 * @param {Object} absence - Die Abwesenheits-Daten
 * @param {string} groupId - Die Gruppen-ID des Kindes
 * @returns {Promise<{success: boolean, sentCount: number, error?: string}>}
 */
export async function sendAbsencePushNotifications(absence, groupId) {
  const reasonLabels = {
    krankheit: "Krankheit",
    urlaub: "Urlaub",
    termin: "Termin",
    sonstiges: "Sonstiges",
  };

  const reasonLabel = reasonLabels[absence.reason] || absence.reason;
  const title = "Neue Abwesenheitsmeldung";
  const body = `${absence.childName}: ${reasonLabel}`;

  return sendPushNotification(title, body, "absences", {
    groupIds: [groupId],
    data: { type: "absence", absenceId: absence.id },
  });
}

/**
 * Sendet Push-Benachrichtigungen für Speiseplan-Updates
 * Zielgruppe: Alle Eltern
 * @param {string} weekRange - Die Wochenspanne (z.B. "16.12. - 20.12.")
 * @returns {Promise<{success: boolean, sentCount: number, error?: string}>}
 */
export async function sendFoodPlanPushNotifications(weekRange) {
  const title = "Speiseplan aktualisiert";
  const body = `Der Speiseplan für ${weekRange} wurde aktualisiert.`;

  return sendPushNotification(title, body, "food", {
    data: { type: "food" },
  });
}
