/**
 * Raivan Global Service Worker — v2.
 * Strategy: cache-first for static shell, network-first for navigation,
 * never cache API/admin/session routes (sensitive data).
 *
 * Version bump: increment CACHE_VERSION on every deploy that changes static assets.
 */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `raivan-${CACHE_VERSION}`;

const STATIC_SHELL = ['/', '/manifest.json', '/offline.html'];

const NEVER_CACHE_PREFIXES = [
  '/_next/',
  '/api/',
  '/admin',
  '/questionnaire',
  '/dashboard',
  '/payment',
  '/report',
  '/onboarding',
  '/enterprise',
  '/auth',
];

function shouldSkipCache(url) {
  const { pathname } = new URL(url);
  return NEVER_CACHE_PREFIXES.some((p) => pathname.startsWith(p));
}

// ─── Install: pre-cache static shell ──────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_SHELL))
      .then(() => self.skipWaiting()),
  );
});

// ─── Activate: delete stale caches ────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('raivan-') && k !== CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Fetch: network-first for navigation, cache-first for assets ───────────────

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (shouldSkipCache(event.request.url)) return;

  const isNavigation = event.request.mode === 'navigate';

  if (isNavigation) {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
      .catch(() => caches.match('/offline.html')),
  );
});
