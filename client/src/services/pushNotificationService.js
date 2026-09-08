import { api } from './api.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export class PushNotificationClient {
  /**
   * Register service worker and subscribe the authenticated user to Web Push notifications.
   */
  static async registerAndSubscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      console.log('[Push] Push notifications not supported in this browser.');
      return null;
    }

    try {
      // 1. Register Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // 2. Request Notification Permission
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        console.log('[Push] Notification permission was not granted:', permission);
        return null;
      }

      // 3. Get existing subscription or create new one
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Fetch public VAPID key from backend
        const keyRes = await api.request('/api/notifications/vapid-key', { method: 'GET' });
        const publicKey = keyRes?.publicKey;

        if (!publicKey) {
          console.warn('[Push] Public VAPID key not available.');
          return null;
        }

        const convertedVapidKey = urlBase64ToUint8Array(publicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      }

      // 4. Send subscription to server if user is logged in
      const token = localStorage.getItem('daily_grace_token');
      if (token && subscription) {
        const subJson = subscription.toJSON();
        await api.request('/api/notifications/subscribe', {
          method: 'POST',
          body: {
            endpoint: subJson.endpoint,
            keys: subJson.keys,
          },
        });
        console.log('[Push] Successfully registered Web Push subscription with server.');
      }

      return subscription;
    } catch (error) {
      console.error('[Push] Failed to register web push notifications:', error);
      return null;
    }
  }

  /**
   * Set App Icon Badge count on mobile/desktop home screen.
   */
  static setAppBadge(count = 1) {
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge(count).catch(() => {});
    }
  }

  /**
   * Clear App Icon Badge on mobile/desktop home screen.
   */
  static clearAppBadge() {
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(() => {});
    }
  }

  /**
   * Clear active Daily Grace notifications when user views today's devotional.
   */
  static clearActiveDevotionNotifications() {
    // Clear badge count
    PushNotificationClient.clearAppBadge();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          if (reg.getNotifications) {
            return reg.getNotifications({ tag: 'daily-devotion' });
          }
          return [];
        })
        .then((notifications) => {
          if (notifications && notifications.length > 0) {
            notifications.forEach((n) => n.close());
            console.log('[Push] Cleared active daily devotion system tray notifications.');
          }
        })
        .catch((err) => {
          console.warn('[Push] Could not clear notifications:', err);
        });
    }
  }
}

