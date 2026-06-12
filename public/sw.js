const CACHE_NAME = 'mudream-timer-v73';
const ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/events-data.js',
    '/exc-items-data.js',
    '/alarm.js',
    '/app.js',
    '/auth.js',
    '/i18n.js',
    '/guild.js',
    '/collection.js',
    '/wishlist.js',
    '/guide.js',
    '/muchat.js',
    '/knowledge-base.js',
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
    // API calls: network only
    if (e.request.url.includes('/api/')) {
        return e.respondWith(fetch(e.request));
    }

    // Audio files: cache first (custom alarm sounds)
    if (e.request.destination === 'audio' || e.request.url.match(/\.(mp3|wav|ogg|webm)(\?|$)/i)) {
        e.respondWith(
            caches.match(e.request).then(cached => {
                if (cached) return cached;
                return fetch(e.request).then(res => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                    return res;
                }).catch(() => cached);
            })
        );
        return;
    }

    // Everything else: network first, fallback to cache
    e.respondWith(
        fetch(e.request)
            .then(res => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                return res;
            })
            .catch(() => caches.match(e.request))
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow('/');
        })
    );
});
