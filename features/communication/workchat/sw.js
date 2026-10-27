// S-Gyver WorkChat Service Worker (PWA Engine v2)
const CACHE_NAME = 'sgyver-workchat-v2';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((k) => caches.delete(k))
            );
        }).then(() => self.clients.claim())
    );
});

// Safe passthrough: Let browser handle navigation and iframes natively
self.addEventListener('fetch', (event) => {
    if (
        event.request.mode === 'navigate' ||
        event.request.destination === 'iframe' ||
        event.request.destination === 'document' ||
        event.request.method !== 'GET' ||
        event.request.url.includes('supabase.co')
    ) {
        return;
    }
});
