/* Laoshi Zhuli — yengil service worker: umumiy fayllarni keshlaydi, Firebase so'rovlariga tegmaydi.
   Strategiya: "avval tarmoq, bo'lmasa kesh" — yangilanishlar darhol ko'rinadi, internet uzilsa ham sahifa ochiladi. */
const CACHE = 'lz-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if(e.request.method !== 'GET' || u.origin !== location.origin) return;
  if(/\/doska\//.test(u.pathname)) return;           // 30 MB doska faylini keshga ko'chirmaymiz (brauzer o'zi keshlaydi)
  e.respondWith(fetch(e.request).then(r => {
    if(r.ok){ const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request)));
});
