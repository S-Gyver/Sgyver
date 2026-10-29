// S-Gyver Workspace & WorkChat Root Service Worker (PWA & Web Push Engine v4.0)
const SUPABASE_PUSH_FN_URL = 'https://igiihteeeprpcxxlldkd.supabase.co/functions/v1/send-workchat-push';
const DEFAULT_WORKCHAT_ICON = './features/communication/workchat/icon-192.png';
const DEFAULT_WORKCHAT_URL = './features/communication/workchat/workchat.html';

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

function showRootWorkchatNotification(rawTitle, rawBody, rawUrl, rawChatId, rawTag, rawIcon) {
    const title = rawTitle || 'WorkChat';
    const body = rawBody || 'มีข้อความใหม่ส่งถึงคุณ';
    const icon = rawIcon || DEFAULT_WORKCHAT_ICON;
    const url = rawUrl || DEFAULT_WORKCHAT_URL;
    const chatId = rawChatId || 'general';
    const tag = rawTag || ('workchat-push-' + Date.now());

    const options = {
        body: body,
        icon: icon,
        badge: icon,
        tag: tag,
        renotify: true,
        requireInteraction: false,
        vibrate: [250, 100, 250, 100, 300],
        timestamp: Date.now(),
        data: {
            url: url,
            chat_id: chatId
        }
    };

    return self.registration.showNotification(title, options).catch(() => {
        return self.registration.showNotification(title, {
            body: body,
            data: { url: url, chat_id: chatId }
        });
    });
}

self.addEventListener('push', (event) => {
    let data = {
        title: 'WorkChat',
        body: 'มีข้อความใหม่ส่งถึงคุณ',
        icon: DEFAULT_WORKCHAT_ICON,
        url: DEFAULT_WORKCHAT_URL
    };

    try {
        if (event.data) {
            const parsed = event.data.json();
            if (parsed && typeof parsed === 'object') {
                data = Object.assign(data, parsed);
            }
        }
    } catch (_) {
        try {
            if (event.data) {
                const txt = event.data.text();
                if (txt) data.body = txt;
            }
        } catch (__) {}
    }

    const title = data.title || data.sender_name || 'WorkChat';
    const body = data.body || data.message_text || 'มีข้อความใหม่ในห้องแชท';
    const tag = data.tag || ('workchat-push-' + Date.now());

    event.waitUntil(
        showRootWorkchatNotification(title, body, data.url || DEFAULT_WORKCHAT_URL, data.chat_id || 'general', tag, data.icon || DEFAULT_WORKCHAT_ICON)
    );
});

self.addEventListener('message', (event) => {
    if (!event.data) return;

    if (event.data.type === 'SHOW_NOTIFICATION') {
        event.waitUntil(
            showRootWorkchatNotification(
                event.data.title || 'WorkChat',
                event.data.body || 'มีข้อความใหม่ส่งถึงคุณ',
                event.data.url || DEFAULT_WORKCHAT_URL,
                event.data.chat_id || 'general',
                event.data.tag || ('workchat-local-' + Date.now()),
                DEFAULT_WORKCHAT_ICON
            )
        );
    } else if (event.data.type === 'DELAYED_TEST_PUSH') {
        const delayMs = Number(event.data.delayMs) || 3000;
        const anonKey = event.data.anonKey || '';
        const title = event.data.title || 'WorkChat (ทดสอบระบบแจ้งเตือน)';
        const body = event.data.body || '🔔 ทดสอบแจ้งเตือนขณะปิดหน้าจอ / ปิดแอปสำเร็จแล้ว!';

        event.waitUntil(
            new Promise((resolve) => setTimeout(resolve, delayMs)).then(async () => {
                if (anonKey) {
                    try {
                        await fetch(SUPABASE_PUSH_FN_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + anonKey,
                                'apikey': anonKey
                            },
                            body: JSON.stringify({
                                sender_name: title,
                                message_text: body,
                                chat_id: 'general',
                                sender_id: 'sw_test_push_' + Date.now()
                            })
                        });
                    } catch (_) {}
                }
                return showRootWorkchatNotification(title, body, DEFAULT_WORKCHAT_URL, 'general', 'workchat-test-' + Date.now(), DEFAULT_WORKCHAT_ICON);
            })
        );
    }
});

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
                return clients.openWindow(event.notification.data?.url || DEFAULT_WORKCHAT_URL);
            }
        })
    );
});
