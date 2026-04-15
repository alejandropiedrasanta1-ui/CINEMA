/* Service Worker — Cinema Productions Push Notifications */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

/* ── Push event: show native OS notification ─────────────────── */
self.addEventListener('push', (event) => {
  let data = { title: 'Cinema Productions', body: '', tag: 'cp-reminder', icon: '/logo.png' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:              data.body,
      icon:              data.icon  || '/logo.png',
      badge:             '/logo.png',
      tag:               data.tag   || 'cp-reminder',
      requireInteraction: data.requireInteraction || false,
      data:              { url: data.url || '/dashboard' },
    })
  );
});

/* ── Notification click: focus or open app ───────────────────── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const existing = wins.find((w) => w.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(target); }
      else clients.openWindow(target);
    })
  );
});
