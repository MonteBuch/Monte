# Email-Benachrichtigungen einrichten

Diese Anleitung erklärt, wie Sie die Email-Benachrichtigungen für News aktivieren.

## Übersicht

Das System sendet automatisch Email-Benachrichtigungen wenn:
- Eine neue News erstellt wird
- Empfänger sind:
  - **Registrierte Eltern** mit aktivierter Email-Benachrichtigung (Notification Preferences)
  - **Externe Emails** aus dem Email-Verzeichnis (Admin → Email-Verzeichnis)

## Voraussetzungen

1. **Resend Account** (kostenlos, 100 Emails/Tag)
2. **Verifizierte Domain** (optional, aber empfohlen für Produktion)

## Einrichtung

### 1. Resend API Key erstellen

1. Gehen Sie zu [resend.com](https://resend.com) und erstellen Sie einen Account
2. Navigieren Sie zu **API Keys** → **Create API Key**
3. Benennen Sie den Key (z.B. "Monte App")
4. Kopieren Sie den API Key (beginnt mit `re_...`)

### 2. API Key in Supabase speichern

1. Öffnen Sie das [Supabase Dashboard](https://supabase.com/dashboard)
2. Wählen Sie Ihr Projekt
3. Gehen Sie zu **Project Settings** → **Edge Functions**
4. Scrollen Sie zu **Edge Function Secrets**
5. Klicken Sie auf **Add new secret**
6. Fügen Sie hinzu:
   - **Name:** `RESEND_API_KEY`
   - **Value:** Ihr Resend API Key

### 3. Absender-Email konfigurieren (optional)

Standardmäßig wird `Monte App <noreply@resend.dev>` als Absender verwendet.

Für eine eigene Domain:
1. Verifizieren Sie Ihre Domain bei Resend unter **Domains**
2. Fügen Sie ein weiteres Secret in Supabase hinzu:
   - **Name:** `FROM_EMAIL`
   - **Value:** `Monte Kinderhaus <noreply@ihre-domain.de>`

## Funktionsweise

### Beim Erstellen einer News:

```
┌─────────────────────────────────────────┐
│  Team/Admin erstellt News               │
│                                         │
│  → Zielgruppe: "Sonne" oder "Alle"      │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  System ermittelt Empfänger:            │
│                                         │
│  1. Registrierte Eltern in "Sonne"      │
│     → Prüft notification_preferences    │
│     → email_news = true → Email senden  │
│                                         │
│  2. Externe Emails im Verzeichnis       │
│     → Alle Emails für "Sonne"           │
│     → Immer Email senden                │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  Edge Function sendet Emails            │
│                                         │
│  → Professionelles HTML-Template        │
│  → Montessori-Branding                  │
│  → "In der App öffnen" Button           │
└─────────────────────────────────────────┘
```

## Email-Verzeichnis pflegen

Als Admin können Sie externe Email-Adressen verwalten:

1. Gehen Sie zu **Admin** → **Email-Verzeichnis**
2. Wählen Sie eine Gruppe
3. Klicken Sie auf **Email hinzufügen**
4. Geben Sie Email, Name des Elternteils und Kind ein

Das System zeigt automatisch:
- 🟢 **Grün:** Registrierte App-Nutzer (folgen ihren Einstellungen)
- 🟠 **Orange:** Externe Emails (erhalten immer Emails)

## Notification Preferences

Registrierte Eltern können ihre Benachrichtigungen unter **Profil** → **Benachrichtigungen** einstellen:

- **email_news:** Email bei neuen News (Standard: aktiviert)
- (Weitere Optionen können später hinzugefügt werden)

## Fehlerbehebung

### "RESEND_API_KEY is not configured"
→ API Key nicht in Supabase Edge Function Secrets gespeichert

### "Failed to send email"
→ API Key ungültig oder Resend-Konto-Problem

### Emails kommen nicht an
1. Prüfen Sie den Spam-Ordner
2. Verifizieren Sie Ihre Domain bei Resend (für Produktion)
3. Prüfen Sie die Supabase Edge Function Logs

### Edge Function Logs prüfen

1. Supabase Dashboard → **Edge Functions** → **send-news-email**
2. Klicken Sie auf **Logs**
3. Suchen Sie nach Fehlermeldungen

## Limits

- **Resend Free Tier:** 100 Emails/Tag, 3.000 Emails/Monat
- **Für mehr:** Resend Pro ab $20/Monat für 50.000 Emails

## Technische Details

### Edge Function
- **Name:** `send-news-email`
- **URL:** `https://[project-ref].supabase.co/functions/v1/send-news-email`
- **Auth:** JWT erforderlich (via Supabase Client)

### API
```javascript
// In der App verwendet
import { sendNewsEmailNotifications } from "../../api/emailApi";

const result = await sendNewsEmailNotifications(
  news,        // News-Objekt
  groupId,     // Gruppen-ID oder null
  groupName,   // Gruppenname für Betreff
  authorName   // Autor für Email
);
```

### Datenbank-Tabellen

- `notification_preferences` - Email-Einstellungen der User
- `group_email_directory` - Externe Email-Adressen
