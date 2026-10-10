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
   * Check browser and platform push support capabilities.
   * Identifies iOS PWA requirement and unsupported environments.
   */
  static checkDeviceSupport() {
    if (typeof window === 'undefined') {
      return { supported: false, status: 'unsupported', message: 'Window not defined' };
    }

    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = Boolean(window.navigator?.standalone) || window.matchMedia?.('(display-mode: standalone)')?.matches;

    // iOS 16.4+ requires site to be added to Home Screen as a standalone PWA
    if (isIOS && !isStandalone) {
      return {
        supported: false,
        isIOS: true,
        isStandalone: false,
        status: 'ios_not_standalone',
        message: 'On iPhone / iPad, Web Push requires installing Daily Grace to your Home Screen first.',
      };
    }

    const hasSW = 'serviceWorker' in navigator;
    const hasPush = 'PushManager' in window;
    const hasNotification = 'Notification' in window;

    if (!hasSW || !hasPush || !hasNotification) {
      return {
        supported: false,
        isIOS,
        isStandalone,
        status: 'unsupported',
        message: 'Push notifications are not supported in this browser.',
      };
    }

    return {
      supported: true,
      isIOS,
      isStandalone,
      status: 'supported',
    };
  }

  /**
   * Determine exact push notification status on this device.
   * Returns one of: 'subscribed', 'prompt', 'denied', 'ios_not_standalone', 'unsupported'.
   */
  static async getDevicePushStatus() {
    const support = PushNotificationClient.checkDeviceSupport();
    if (!support.supported) {
      return support;
    }

    const permission = Notification.permission;

    if (permission === 'denied') {
      return {
        supported: true,
        permission: 'denied',
        status: 'denied',
        message: 'Permission blocked in browser settings',
      };
    }

    if (permission === 'default') {
      return {
        supported: true,
        permission: 'default',
        status: 'prompt',
        message: 'Permission needed',
      };
    }

    // Permission is 'granted' - verify active subscription in Service Worker
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      const subscription = registration ? await registration.pushManager.getSubscription() : null;

      if (subscription) {
        return {
          supported: true,
          permission: 'granted',
          status: 'subscribed',
          subscription,
          endpoint: subscription.endpoint,
          message: 'Enabled on this device',
        };
      }

      return {
        supported: true,
        permission: 'granted',
        status: 'prompt',
        subscription: null,
        message: 'Permission granted, device setup required',
      };
    } catch (err) {
      console.warn('[Push] Error reading service worker registration:', err);
      return {
        supported: true,
        permission: 'granted',
        status: 'prompt',
        subscription: null,
        message: 'Setup required on this device',
      };
    }
  }

  /**
   * Enable notifications explicitly on this device from a direct user click.
   * NOTE: Notification.requestPermission() is called immediately without any preceding async await
   * to guarantee compliance with mobile browser user-gesture requirements.
   */
  static async enableDeviceNotifications() {
    if (!('Notification' in window)) {
      const err = new Error('Notifications are not supported in this browser.');
      err.code = 'UNSUPPORTED';
      throw err;
    }

    // 1. Immediately request permission on the user click thread
    console.log('[Push Diagnostics] Requesting Notification permission via user gesture...');
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    console.log(`[Push Diagnostics] Notification permission is: ${permission}`);

    if (permission === 'denied') {
      const err = new Error('Notification permission was blocked in browser settings. Please update Chrome permissions to allow notifications.');
      err.code = 'PERMISSION_BLOCKED';
      throw err;
    }

    if (permission !== 'granted') {
      const err = new Error('Notification permission was not granted.');
      err.code = 'PERMISSION_NOT_GRANTED';
      throw err;
    }

    // 2. Register/verify Service Worker
    console.log('[Push Diagnostics] Registering service worker /sw.js...');
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    console.log('[Push Diagnostics] Service worker is active and ready.');

    // 3. Obtain server VAPID public key
    console.log('[Push Diagnostics] Fetching VAPID public key from server...');
    let keyRes;
    try {
      keyRes = await api.request('/api/notifications/vapid-key', { method: 'GET' });
    } catch (e1) {
      console.warn('[Push Diagnostics] /vapid-key failed, attempting /vapid-public-key fallback:', e1.message);
      keyRes = await api.request('/api/notifications/vapid-public-key', { method: 'GET' });
    }

    const publicKey = keyRes?.publicKey;

    if (!publicKey) {
      const err = new Error('Public encryption key could not be retrieved from the server.');
      err.code = 'VAPID_KEY_UNAVAILABLE';
      throw err;
    }
    console.log('[Push Diagnostics] Received VAPID public key.');

    const convertedVapidKey = urlBase64ToUint8Array(publicKey);

    // 4. Create or reuse valid PushSubscription
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      try {
        const currentKey = subscription.options?.applicationServerKey;
        if (currentKey) {
          const currentKeyBytes = new Uint8Array(currentKey);
          const isKeyMatching = currentKeyBytes.length === convertedVapidKey.length &&
            currentKeyBytes.every((b, i) => b === convertedVapidKey[i]);
          if (!isKeyMatching) {
            console.log('[Push Diagnostics] Existing subscription key mismatch, renewing...');
            await subscription.unsubscribe();
            subscription = null;
          }
        }
      } catch (keyErr) {
        console.warn('[Push Diagnostics] Key verification check warning:', keyErr.message);
      }
    }

    if (!subscription) {
      console.log('[Push Diagnostics] Subscribing via PushManager...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
      console.log('[Push Diagnostics] Browser PushSubscription created.');
    } else {
      console.log('[Push Diagnostics] Reusing existing valid PushSubscription.');
    }

    // 5. Save to authenticated backend user account
    const token = localStorage.getItem('daily_grace_token');
    if (!token) {
      const err = new Error('You must be signed in to register push notifications.');
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    const subJson = subscription.toJSON();
    console.log('[Push Diagnostics] Saving subscription to backend POST /api/notifications/subscribe...');
    const saveRes = await api.request('/api/notifications/subscribe', {
      method: 'POST',
      body: {
        endpoint: subJson.endpoint,
        keys: subJson.keys,
      },
    });

    if (!saveRes || !saveRes.success) {
      const err = new Error(saveRes?.message || 'The server failed to save the device subscription.');
      err.code = 'SERVER_SAVE_FAILED';
      throw err;
    }

    console.log('[Push Diagnostics] Subscription successfully saved and active on server.');
    return subscription;
  }

  /**
   * Send a safe test notification exclusively to this device.
   * Calls protected POST /api/notifications/test-device-push with the current device endpoint.
   */
  static async testCurrentDevice(endpoint = null) {
    let targetEndpoint = endpoint;

    if (!targetEndpoint && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      targetEndpoint = sub?.endpoint;
    }

    if (!targetEndpoint) {
      const err = new Error('No active push subscription found on this device to test. Please enable notifications first.');
      err.code = 'NO_LOCAL_SUBSCRIPTION';
      throw err;
    }

    console.log('[Push Diagnostics] Sending test-device-push request to backend...');
    const result = await api.request('/api/notifications/test-device-push', {
      method: 'POST',
      body: {
        endpoint: targetEndpoint,
      },
    });
    console.log('[Push Diagnostics] Test-device-push response:', result);
    return result;
  }

  /**
   * Legacy wrapper kept for backwards compatibility.
   */
  static async registerAndSubscribe() {
    return PushNotificationClient.enableDeviceNotifications();
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
          }
        })
        .catch((err) => {
          console.warn('[Push] Could not clear notifications:', err);
        });
    }
  }
}
