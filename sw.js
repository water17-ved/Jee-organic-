// Service worker for the JEE Organic Chemistry Field Guide.
// Strategy: precache the app shell (HTML/manifest/icons) so the site opens
// with zero network; cache CDN assets (fonts, MathJax, Tailwind, FontAwesome)
// the first time they're fetched so later offline visits still have them.

const CACHE_VERSION = 'jee-ochem-v1';
const APP_SHELL = [
    './',
    './index.html',
    './short-notes.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)).catch(() => {})
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;

    event.respondWith(
        caches.match(req).then(cached => {
            if (cached) {
                // Stale-while-revalidate: serve cache instantly, refresh in background.
                fetch(req).then(res => {
                    if (res && res.ok) caches.open(CACHE_VERSION).then(c => c.put(req, res.clone()));
                }).catch(() => {});
                return cached;
            }
            return fetch(req).then(res => {
                if (res && res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE_VERSION).then(c => c.put(req, clone));
                }
                return res;
            }).catch(() => {
                // Offline and not cached (e.g. first-ever visit to a CDN asset) —
                // fall back to the app shell page so navigation still works.
                if (req.mode === 'navigate') return caches.match('./index.html');
                return new Response('', { status: 504, statusText: 'Offline' });
            });
        })
    );
});
