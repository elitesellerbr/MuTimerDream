const CACHE_NAME = 'mudream-timer-v99';
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
    '/exchange.js',
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

// Helpers
const isStaticAsset = (url) => /\.(css|js|svg|png|jpg|jpeg|webp|gif|woff2?|ttf|ico)(\?|$)/i.test(url);
const isMudreamCdn = (url) => /dreamassets\.fra1\.(cdn\.)?digitaloceanspaces\.com/.test(url);
const isApi = (url) => url.includes('/api/');

self.addEventListener('fetch', e => {
    const url = e.request.url;
    const method = e.request.method;

    // Non-GET requests pass through untouched (no caching)
    if (method !== 'GET') return;

    // API calls: network only (never cached — auth-sensitive)
    if (isApi(url)) {
        return e.respondWith(fetch(e.request));
    }

    // Audio: cache-first (silent fallback)
    if (e.request.destination === 'audio' || /\.(mp3|wav|ogg|webm)(\?|$)/i.test(url)) {
        e.respondWith(
            caches.match(e.request).then(cached => {
                if (cached) return cached;
                return fetch(e.request).then(res => {
                    if (res.ok) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                    }
                    return res;
                }).catch(() => cached);
            })
        );
        return;
    }

    // MU Dream CDN images (boss GIFs, item images) — cache-first, stale-while-revalidate
    if (isMudreamCdn(url)) {
        e.respondWith(
            caches.match(e.request).then(cached => {
                const fetchPromise = fetch(e.request).then(res => {
                    if (res.ok) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                    }
                    return res;
                }).catch(() => cached);
                return cached || fetchPromise;
            })
        );
        return;
    }

    // Static assets (.css, .js, images, fonts) — cache-first with background refresh
    if (isStaticAsset(url)) {
        e.respondWith(
            caches.match(e.request).then(cached => {
                const fetchPromise = fetch(e.request).then(res => {
                    if (res.ok) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                    }
                    return res;
                }).catch(() => cached);
                // Return cache immediately if we have it, refresh in background
                return cached || fetchPromise;
            })
        );
        return;
    }

    // HTML and everything else: network-first so updates show up promptly
    e.respondWith(
        fetch(e.request)
            .then(res => {
                if (res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                }
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
