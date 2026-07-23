self.addEventListener('push', function (event) {
  let data = {};
  try { data = event.data.json(); } catch (e) { data = { title: 'New Ambulance Request', body: 'Tap to respond' }; }

  const options = {
    body: data.body || 'Tap to open your dashboard',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: true,
    tag: 'trip-offer',
    renotify: true,
    data: { url: data.url || '/driver' },
  };

  event.waitUntil(self.registration.showNotification(data.title || 'New Ambulance Request', options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data?.url || '/driver';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
