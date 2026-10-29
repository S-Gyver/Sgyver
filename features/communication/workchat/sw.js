// S-Gyver WorkChat Service Worker (PWA Engine v3.9)
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

// Handle incoming Web Push notifications (Background / Lock Screen Push)
self.addEventListener('push', (event) => {
    let data = {
        title: 'WorkChat',
        body: 'มีข้อความใหม่ส่งถึงคุณ',
        icon: './icon-192.png',
        url: './workchat.html'
    };

    try {
        if (event.data) {
            const parsed = event.data.json();
            data = Object.assign(data, parsed);
        }
    } catch (_) {
        try {
            if (event.data) data.body = event.data.text();
        } catch (__) {}
    }

    const title = data.title || data.sender_name || 'WorkChat';
    const body = data.body || data.message_text || 'มีข้อความใหม่ในห้องแชท';
    const tag = data.tag || ('workchat-push-' + Date.now());

    const options = {
        body: body,
        icon: data.icon || './icon-192.png',
        badge: './icon-192.png',
        tag: tag,
        renotify: true,
        requireInteraction: false,
        silent: false,
        vibrate: [250, 100, 250, 100, 300],
        timestamp: Date.now(),
        data: {
            url: data.url || './workchat.html',
            chat_id: data.chat_id || 'general'
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Handle message from page to trigger background/lockscreen notification via SW
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const title = event.data.title || 'WorkChat';
        const options = {
            body: event.data.body || 'มีข้อความใหม่ส่งถึงคุณ',
            icon: './icon-192.png',
            badge: './icon-192.png',
            tag: event.data.tag || ('workchat-local-' + Date.now()),
            renotify: true,
            vibrate: [250, 100, 250],
            data: { url: './workchat.html' }
        };
        event.waitUntil(self.registration.showNotification(title, options));
    }
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
