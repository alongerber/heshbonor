/* ============================================================
   ZIRAT HAKEFEL — service worker
   The game must work on a plane, but a new build must never be
   locked out by an old cache. So: the page itself is fetched
   from the network first and only falls back to the cache when
   the network is gone; assets are served from the cache first
   because they never change without changing their name.
   ============================================================ */
const C = 'zirat-v18';

/* the shell only — art, fonts and Morris's voice are warmed after
   activation, one file at a time, so a single bad file cannot fail
   the whole install */
const SHELL = ['/', '/index.html', '/manifest.webmanifest',
               '/og-v2.jpg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c => Promise.all(
    SHELL.map(u => c.add(u).catch(() => {})))));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== C).map(k => caches.delete(k)));
    await clients.claim();
    const c = await caches.open(C);
    for (const dir of ['art', 'fonts', 'audio']) {
      try {
        const r = await fetch('/' + dir + '/manifest.json');
        if (!r.ok) continue;
        const m = await r.json();
        for (const k in m) { try { await c.add('/' + dir + '/' + m[k].file) } catch (_) {} }
      } catch (_) {}
    }
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  /* the build stamp is the one thing that must never come from a cache —
     it is what tells a stale phone that it is stale */
  if (req.url.indexOf('version.json') > -1) {
    e.respondWith(fetch(req).catch(() => new Response('{}', {
      headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  /* the document: network first, so a fresh deploy is picked up on the
     next visit instead of being shadowed by the cache forever */
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(C); c.put('/index.html', res.clone());
        return res;
      } catch (_) {
        return (await caches.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  /* everything else: cache first, then network — and on failure return a
     real failure. Handing back index.html here is what turns a missing
     image into a broken image. */
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok) { const c = await caches.open(C); c.put(req, res.clone()) }
      return res;
    } catch (_) {
      return Response.error();
    }
  })());
});
