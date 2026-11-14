/* Service worker: Web Push for calls & messages */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {}; try { d = e.data.json(); } catch {}
  e.waitUntil((async () => {
    if (d.kind === 'cancel') {
      const list = await self.registration.getNotifications({ tag: d.tag });
      list.forEach(n => n.close());
      return;
    }
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.some(w => w.visibilityState === 'visible')) {
      wins.forEach(w => w.postMessage({ type: 'push-visible', data: d }));
      return; // app is on screen: in-app UI handles it
    }
    const isCall = d.kind === 'call';
    await self.registration.showNotification(d.title || 'امون', {
      body: d.body || '', tag: d.tag, renotify: true, icon: 'icon-192.png', badge: 'icon-192.png', dir: 'rtl', lang: 'fa',
      requireInteraction: isCall, vibrate: isCall ? [400, 200, 400, 200, 400] : [150],
      data: d, actions: isCall ? [{ action: 'open', title: 'پاسخ' }] : []
    });
  })());
});

self.addEventListener('notificationclick', e => {
  const d = e.notification.data || {};
  e.notification.close();
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.length) {
      const w = wins.find(x => x.visibilityState === 'visible') || wins[0];
      await w.focus();
      w.postMessage({ type: 'open', data: d });
    } else {
      await self.clients.openWindow('./?open=' + encodeURIComponent(d.kind || '') );
    }
  })());
});
