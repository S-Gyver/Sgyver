// S-Gyver Workspace Service Worker (PWA Installability Engine v2)
const CACHE_NAME = 'sgyver-pwa-v2';

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

// Safe passthrough: Never block or break navigation, iframes, redirects, or API calls
self.addEventListener('fetch', (event) => {
    // Let browser natively handle documents, iframes, navigation, POST requests, and Supabase
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
