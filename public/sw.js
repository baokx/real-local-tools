/*
 * Offline support for real-local-tools.com.
 * - Navigations: network-first, so fresh deploys win; falls back to the
 *   cached copy offline (every tool runs client-side, so a cached page is
 *   fully functional), then to the cached home page.
 * - Same-origin assets (hashed /_astro/*, images, styles): cache-first.
 * - Google Fonts: stale-while-revalidate.
 * Bump CACHE_VERSION whenever precached files or runtime behavior change so
 * stale caches are purged on activate.
 */
const CACHE_VERSION = 'v1';
const PAGE_CACHE = `rlt-pages-${CACHE_VERSION}`;
const ASSET_CACHE = `rlt-assets-${CACHE_VERSION}`;
const ACTIVE_CACHES = [PAGE_CACHE, ASSET_CACHE];

const PRECACHE = ['/', '/zh/', '/es/', '/ja/', '/favicon.svg', '/manifest.webmanifest'];

const FONT_ORIGINS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      // Individual adds: one missing file must not abort the whole install.
      await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => !ACTIVE_CACHES.includes(name)).map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const fallback = await caches.match('/');
    if (fallback) return fallback;
    throw err;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(ASSET_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const fetched = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fetched;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith(networkFirst(request));
    } else if (
      url.pathname.startsWith('/_astro/') ||
      ['style', 'script', 'font', 'image'].includes(request.destination)
    ) {
      event.respondWith(cacheFirst(request));
    }
    return;
  }

  if (FONT_ORIGINS.includes(url.origin)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
