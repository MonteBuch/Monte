# E-Mail Templates für Supabase

Diese Templates können im Supabase Dashboard unter **Authentication → Email Templates** eingefügt werden.

## So richten Sie die Templates ein

1. Öffnen Sie das [Supabase Dashboard](https://supabase.com/dashboard)
2. Wählen Sie Ihr Projekt
3. Gehen Sie zu **Authentication** → **Email Templates**
4. Wählen Sie **Confirm signup**
5. Kopieren Sie den Inhalt von `signup-confirmation.html` in das Template-Feld
6. Passen Sie den **Subject** an: `Willkommen bei Monte - Bitte bestätigen Sie Ihre E-Mail`
7. Klicken Sie auf **Save**

## Verfügbare Templates

### signup-confirmation.html
- **Verwendung:** Bestätigung bei Neuregistrierung
- **Supabase Template:** "Confirm signup"
- **Betreff-Vorschlag:** `Willkommen bei Monte - Bitte bestätigen Sie Ihre E-Mail`

## Verfügbare Variablen

Supabase stellt folgende Variablen zur Verfügung, die im Template verwendet werden können:

| Variable | Beschreibung |
|----------|--------------|
| `{{ .ConfirmationURL }}` | Der Bestätigungslink |
| `{{ .Email }}` | Die E-Mail-Adresse des Benutzers |
| `{{ .Token }}` | Der Bestätigungs-Token |
| `{{ .TokenHash }}` | Hash des Tokens |
| `{{ .SiteURL }}` | Die Site-URL aus den Projekt-Einstellungen |

## Wichtige Einstellungen

### Site URL konfigurieren
Die `{{ .ConfirmationURL }}` basiert auf der **Site URL** in Ihren Projekteinstellungen:
1. Gehen Sie zu **Authentication** → **URL Configuration**
2. Setzen Sie die **Site URL** auf Ihre App-Domain (z.B. `https://monte-app.de`)

### Redirect URLs
Fügen Sie Ihre App-Domain zu den erlaubten Redirect URLs hinzu:
1. **Authentication** → **URL Configuration** → **Redirect URLs**
2. Fügen Sie hinzu: `https://monte-app.de/*` (oder Ihre Domain)

## Vorschau testen

Nach dem Speichern können Sie eine Test-E-Mail senden:
1. Erstellen Sie einen neuen Test-Benutzer
2. Prüfen Sie den E-Mail-Eingang
3. Passen Sie das Design bei Bedarf an
