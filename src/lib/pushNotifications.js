import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../api/supabaseClient';

/**
 * Push Notifications Service
 * Verwendet Firebase Cloud Messaging (FCM) fuer Android
 */

// Prueft ob Push Notifications verfuegbar sind
export function isPushAvailable() {
  return Capacitor.isNativePlatform();
}

// Registriert fuer Push Notifications und speichert Token
export async function registerPushNotifications(userId) {
  if (!isPushAvailable()) {
    console.log('Push notifications not available on this platform');
    return null;
  }

  try {
    // Berechtigung pruefen/anfordern
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.log('Push permission not granted');
      return null;
    }

    // Fuer Push registrieren
    await PushNotifications.register();

    // Auf Token warten
    return new Promise((resolve) => {
      PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token:', token.value);

        // Token in Supabase speichern
        await savePushToken(userId, token.value);

        resolve(token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
        resolve(null);
      });
    });
  } catch (error) {
    console.error('Push registration failed:', error);
    return null;
  }
}

// Speichert FCM Token in Supabase
async function savePushToken(userId, token) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ fcm_token: token })
      .eq('id', userId);

    if (error) {
      console.error('Failed to save push token:', error);
    }
  } catch (err) {
    console.error('Error saving push token:', err);
  }
}

// Entfernt Push Token (beim Logout)
export async function removePushToken(userId) {
  if (!isPushAvailable()) return;

  try {
    await supabase
      .from('profiles')
      .update({ fcm_token: null })
      .eq('id', userId);

    await PushNotifications.removeAllListeners();
  } catch (err) {
    console.error('Error removing push token:', err);
  }
}

// Listener fuer eingehende Notifications einrichten
export function setupPushListeners(onNotificationReceived) {
  if (!isPushAvailable()) return;

  // Notification im Vordergrund empfangen
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push notification received:', notification);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Notification angetippt (App war im Hintergrund)
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('Push notification action:', action);
    // Hier koennte Navigation zu bestimmten Screens erfolgen
    const data = action.notification.data;
    if (data?.type === 'news' && data?.newsId) {
      // TODO: Zu News navigieren
    }
  });
}

// Alle Listener entfernen (beim Logout)
export async function cleanupPushListeners() {
  if (!isPushAvailable()) return;

  await PushNotifications.removeAllListeners();
}
