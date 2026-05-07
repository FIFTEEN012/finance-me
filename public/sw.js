const CACHE = 'financeme-v1'

const PRECACHE = [
  '/',
  '/dashboard',
  '/transactions',
  '/budgets',
  '/reports',
]

/* ── Install: pre-cache app shell ── */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

/* ── Activate: purge old caches ── */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

/* ── Fetch: network-first for API/navigation, cache-first for assets ── */
self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Skip non-GET, cross-origin, and Next.js internal requests
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/_next/webpack-hmr')) return
  if (url.pathname.startsWith('/api/')) return

  // Static assets (_next/static) — cache first
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    e.respondWith(
      caches.match(request).then((cached) =>
        cached ?? fetch(request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE).then((cache) => cache.put(request, clone))
          return res
        })
      )
    )
    return
  }

  // Navigation & pages — network first, fall back to cache, then offline page
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE).then((cache) => cache.put(request, clone))
          return res
        })
        .catch(() => caches.match(request).then((cached) => cached ?? caches.match('/dashboard')))
    )
    return
  }

  // Everything else — stale-while-revalidate
  e.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((res) => {
        caches.open(CACHE).then((cache) => cache.put(request, res.clone()))
        return res
      })
      return cached ?? network
    })
  )
})
