/* PWA: guarda os arquivos estáticos e mostra /offline sem internet.
   Páginas e dados vêm sempre da rede (os números precisam estar atualizados). */
const VERSAO = 'cv-v2';
const ESTATICOS = ['/offline', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ESTATICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/offline')));
    return;
  }
  // Arquivos do build do Next têm hash no nome: cache primeiro.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/img/')) {
    e.respondWith(caches.open(VERSAO).then(async cache => {
      const salvo = await cache.match(req);
      if (salvo) return salvo;
      const resp = await fetch(req);
      if (resp.ok) cache.put(req, resp.clone());
      return resp;
    }));
  }
});
