/* ============================================================
   ZIRAT HAKEFEL — service worker
   The game must work on a plane, but a new build must never be
   locked out by an old cache. So: the page itself is fetched
   from the network first and only falls back to the cache when
   the network is gone; assets are served from the cache first
   because they never change without changing their name.
   ============================================================ */
const C = 'zirat-v20';

/* the shell only — art, fonts and Morris's voice are warmed after
   activation, in small batches, so a single bad file cannot fail the
   whole install and a slow one cannot hold up the rest */
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
    /* Morris is 101 files. Warming them strictly one at a time left him
       half-cached whenever the browser stopped the worker early — and a
       half-cached narrator is exactly the one that cuts out mid-sentence.
       Small parallel batches finish the job in a fraction of the time
       while still not opening 123 sockets at once. */
    const warm = async (urls) => {
      const BATCH = 8;
      for (let i = 0; i < urls.length; i += BATCH) {
        await Promise.all(urls.slice(i, i + BATCH).map(u =>
          fetch(u).then(r => (r && r.status === 200) ? c.put(u, r) : null)
                  .catch(() => {})));
      }
    };
    for (const dir of ['audio', 'art', 'fonts']) {
      try {
        const r = await fetch('/' + dir + '/manifest.json');
        if (!r.ok) continue;
        const m = await r.json();
        await warm(Object.keys(m).map(k => '/' + dir + '/' + m[k].file));
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
        if (res && res.status === 200) {
          const c = await caches.open(C);
          c.put('/index.html', res.clone()).catch(() => {});
        }
        return res;
      } catch (_) {
        return (await caches.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  /* ============================================================
     Everything else: cache first, then network.

     THE RANGE TRAP. An <audio> element does not ask for a file, it asks
     for BYTES: it sends a Range header and the server answers 206 Partial
     Content. Two things followed from that, and together they are why
     Morris stuttered and skipped mid-sentence.

     First, `res.ok` is true for a 206 — but cache.put() REFUSES a partial
     response and throws. The put was neither awaited nor caught, so every
     clip produced an unhandled rejection; that is the wall of
     "Partial response (status code 206) is unsupported" in the console.

     Second, and worse: because the put always threw, no voice clip was
     ever stored. Every single one was re-fetched over the network, in the
     middle of a spoken sentence, and any that arrived late or failed was
     skipped by the audio element's error handler.

     The fix is to stop asking for bytes. Requesting req.url drops the
     Range header, so the network returns a whole 200 that the cache will
     actually accept, and matching by URL then serves that whole file to a
     ranged request too. Morris's clips are a few kilobytes each — nothing
     here needs seeking, and a cached clip starts instantly.
     ============================================================ */
  e.respondWith((async () => {
    const c = await caches.open(C);
    const hit = await c.match(req.url);
    if (hit) return hit;
    try {
      const res = await fetch(req.url);
      /* only a complete response is worth keeping — never a 206, never a
         redirect, never an error page */
      if (res && res.status === 200) c.put(req.url, res.clone()).catch(() => {});
      return res;
    } catch (_) {
      return Response.error();
    }
  })());
});
