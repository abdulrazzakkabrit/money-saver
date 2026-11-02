// Money Saver service worker: makes the app installable and lets the
// app shell open when the connection is weak. Network first, so updates show.
const CACHE = 'money-saver-shell-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Only handle our own files. Supabase, exchange-rate and other requests go straight to the network.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Only keep good answers, so an error page never replaces the saved app
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(c => c.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Server reminders: show the motivation even when the app is closed.
self.addEventListener('push', event => {
  let data = { title: 'Money Saver', body: 'Small savings, big goals.' };
  try { data = event.data.json(); } catch (e) {}
  event.waitUntil(self.registration.showNotification(data.title || 'Money Saver', {
    body: data.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: 'money-saver-motivation'
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('./'));
});
