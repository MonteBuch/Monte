import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

const CREDENTIALS_SERVER = 'monte-app-credentials';

/**
 * Biometrische Authentifizierung Service
 * Speichert Credentials sicher im Android Keystore / iOS Keychain
 */

// Prüft ob Biometrie verfügbar ist
export async function isBiometricAvailable() {
  // Nur auf nativen Plattformen verfügbar
  if (!Capacitor.isNativePlatform()) {
    return { available: false, biometryType: null };
  }

  try {
    const result = await NativeBiometric.isAvailable();
    return {
      available: result.isAvailable,
      biometryType: result.biometryType,
      biometryTypeName: getBiometryTypeName(result.biometryType),
    };
  } catch (error) {
    console.error('Biometric check failed:', error);
    return { available: false, biometryType: null };
  }
}

// Biometrie-Typ als lesbare Bezeichnung
function getBiometryTypeName(type) {
  switch (type) {
    case BiometryType.FINGERPRINT:
      return 'Fingerabdruck';
    case BiometryType.FACE_AUTHENTICATION:
      return 'Gesichtserkennung';
    case BiometryType.IRIS_AUTHENTICATION:
      return 'Iris-Scan';
    default:
      return 'Biometrie';
  }
}

// Prüft ob Credentials gespeichert sind
export async function hasStoredCredentials() {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    // Versuche Credentials zu lesen (ohne Biometrie-Check)
    const credentials = await NativeBiometric.getCredentials({
      server: CREDENTIALS_SERVER,
    });
    return !!(credentials?.username && credentials?.password);
  } catch (error) {
    // Keine Credentials gespeichert oder Fehler
    return false;
  }
}

// Speichert Credentials sicher (nach erfolgreichem Login)
export async function saveCredentials(email, password) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Biometrie nur auf mobilen Geräten verfügbar');
  }

  try {
    await NativeBiometric.setCredentials({
      username: email,
      password: password,
      server: CREDENTIALS_SERVER,
    });
    return true;
  } catch (error) {
    console.error('Failed to save credentials:', error);
    throw new Error('Credentials konnten nicht gespeichert werden');
  }
}

// Löscht gespeicherte Credentials
export async function deleteCredentials() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await NativeBiometric.deleteCredentials({
      server: CREDENTIALS_SERVER,
    });
  } catch (error) {
    console.error('Failed to delete credentials:', error);
  }
}

// Authentifiziert mit Biometrie und gibt Credentials zurück
export async function authenticateWithBiometric() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Biometrie nur auf mobilen Geräten verfügbar');
  }

  try {
    // Biometrie-Prompt anzeigen
    await NativeBiometric.verifyIdentity({
      reason: 'Bitte bestätigen Sie Ihre Identität',
      title: 'Anmeldung',
      subtitle: 'Monte App',
      description: 'Verwenden Sie Ihren Fingerabdruck oder Gesichtserkennung',
      negativeButtonText: 'Abbrechen',
    });

    // Nach erfolgreicher Biometrie: Credentials laden
    const credentials = await NativeBiometric.getCredentials({
      server: CREDENTIALS_SERVER,
    });

    if (!credentials?.username || !credentials?.password) {
      throw new Error('Keine gespeicherten Zugangsdaten gefunden');
    }

    return {
      email: credentials.username,
      password: credentials.password,
    };
  } catch (error) {
    console.error('Biometric authentication failed:', error);

    // Benutzerfreundliche Fehlermeldungen
    if (error.message?.includes('cancel') || error.code === 'BIOMETRIC_DISMISSED') {
      throw new Error('Authentifizierung abgebrochen');
    }
    if (error.message?.includes('locked') || error.code === 'BIOMETRIC_LOCKED_OUT') {
      throw new Error('Biometrie gesperrt. Bitte verwenden Sie Ihr Passwort.');
    }

    throw new Error('Biometrische Authentifizierung fehlgeschlagen');
  }
}

// Prüft ob Biometrie aktiviert ist (Credentials vorhanden + Biometrie verfügbar)
export async function isBiometricEnabled() {
  const [available, hasCredentials] = await Promise.all([
    isBiometricAvailable(),
    hasStoredCredentials(),
  ]);

  return available.available && hasCredentials;
}
