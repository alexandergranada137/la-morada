const prefix = 'morada-public-';
const cacheName = prefix + 'v2';
const publicPages = new Set([
  '/', '/index.html', '/recorrido.html', '/plano.html', '/cotizacion.html',
  '/comunidad.html', '/contacto.html', '/privacidad.html', '/condiciones.html', '/aviso-legal.html', '/cookies.html'
]);
const planData = new Set(['/lots.json','/cad-terrain.json','/cad-landscape.json','/panoramas.json']);

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const names = await caches.keys();
  await Promise.all(names.filter(name => name.startsWith(prefix) && name !== cacheName).map(name => caches.delete(name)));
  await self.clients.claim();
})()));

function cacheable(response) {
  return response.ok && response.type === 'basic' && !response.redirected &&
    !/\b(?:private|no-store)\b/i.test(response.headers.get('Cache-Control') || '');
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      request.cache === 'no-store' || request.headers.has('range')) return;

  if (request.mode === 'navigate' && publicPages.has(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(cacheName).catch(() => null);
      try {
        const response = await fetch(request);
        if (cache && cacheable(response)) await cache.put(url.pathname, response.clone()).catch(() => {});
        return response;
      } catch {
        return (await cache?.match(url.pathname)) || Response.error();
      }
    })());
    return;
  }

  const asset = planData.has(url.pathname) ||
    /^\/(?:vendor|fonts)\//.test(url.pathname) ||
    /^\/assets\/.*\.(?:webp|jpe?g|png|svg|avif|woff2?)$/i.test(url.pathname) ||
    /^\/[\w-]+\.(?:css|js)$/.test(url.pathname);
  if (!asset || url.pathname === '/morada-cache.js' || url.pathname.startsWith('/admin')) return;

  const cached = caches.open(cacheName).then(cache => cache.match(request)).catch(() => undefined);
  const refreshed = fetch(request).then(async response => {
    if (cacheable(response)) {
      try {
        const cache = await caches.open(cacheName);
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        if (keys.length > 160) await cache.delete(keys[0]);
      } catch {
        // Storage quota or browser settings can prevent caching.
      }
    }
    return response;
  });
  event.waitUntil(refreshed.catch(() => {}));
  event.respondWith(cached.then(response => response || refreshed));
});
