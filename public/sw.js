const CACHE_NAME = 'mudream-timer-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/events-data.js',
    '/alarm.js',
    '/app.js',
    '/auth.js',
    '/i18n.js',
    '/favicon.svg',
    '/icon-192.png',
    '/icon-512.png',
    '/manifest.json'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    // Network first, fallback to cache (for API calls skip cache)
    if (e.request.url.includes('/api/')) {
        return e.respondWith(fetch(e.request));
    }
    e.respondWith(
        fetch(e.request)
            .then(res => {
                // Update cache with fresh response
                const clone = res.clone();
                caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                return res;
            })
            .catch(() => caches.match(e.request))
    );
});
