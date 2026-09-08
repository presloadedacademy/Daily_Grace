// Daily Grace Service Worker - Web Push Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 1. Listen to incoming push notifications
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "Your daily devotional is ready." };
  }

  // Set App Icon badge count on home screen / app dock
  if ('setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(1).catch(() => {});
  }

  const title = data.title || 'Daily Grace 🌿';
  const options = {
    body: data.body || "Your daily devotional is ready.",
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'daily-devotion',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/today',
      timestamp: data.timestamp || Date.now(),
    },
  };

  const showNotificationPromise = self.registration.showNotification(title, options);

  // Send message to any active/open foreground client windows
  const broadcastPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    for (const client of windowClients) {
      client.postMessage({
        type: 'PUSH_NOTIFICATION',
        payload: {
          title,
          body: options.body,
          url: options.data.url,
          timestamp: options.data.timestamp,
        },
      });
    }
  });

  event.waitUntil(Promise.all([showNotificationPromise, broadcastPromise]));
});

// 2. Listen to notification click and navigate to /today
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Clear App Icon badge count
  if ('clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }

  const targetUrl = event.notification.data?.url || '/today';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if available
      for (const client of windowClients) {
        if (client.url.includes('/today') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window/tab to /today
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 3. Listen to notification close event to clear badge if dismissed
self.addEventListener('notificationclose', () => {
  if ('clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }
});

