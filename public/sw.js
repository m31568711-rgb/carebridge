const CACHE_NAME = 'carebridge-react-shell-v2';
const OFFLINE_ROUTES = ['/en/offline', '/fr/offline', '/ar/offline'];
const SHELL_ASSETS = ['/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', ...OFFLINE_ROUTES];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.includes('/auth/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        const locale = ['en', 'fr', 'ar'].includes(url.pathname.split('/')[1]) ? url.pathname.split('/')[1] : 'en';
        return caches.match(`/${locale}/offline`);
      }),
    );
    return;
  }

  const isStaticShell = url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname === '/manifest.webmanifest';
  if (isStaticShell) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const clone = response.clone();
      void caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      return response;
    })));
  }
});
