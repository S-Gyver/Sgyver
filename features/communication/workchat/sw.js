// S-Gyver WorkChat Service Worker (PWA Engine v3.4)
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.map((k) => caches.delete(k)));
        }).then(() => self.clients.claim())
    );
});

// Handle incoming Web Push notifications (Background Push)
self.addEventListener('push', (event) => {
    let data = { title: 'WorkChat', body: 'มีข้อความใหม่', icon: 'icon-192.png' };
    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (_) {
        if (event.data) data.body = event.data.text();
    }

    const options = {
        body: data.body || 'มีข้อความใหม่ในห้องแชท',
        icon: data.icon || 'icon-192.png',
        badge: 'icon-192.png',
        vibrate: [200, 100, 200],
        data: { url: data.url || './workchat.html' }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'WorkChat', options)
    );
});

// Handle tapping on the system notification
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data?.url || './workchat.html');
            }
        })
    );
});
