/* PWA: cache dos arquivos estáticos e página offline.
   Páginas e dados sempre vêm da rede (os números precisam estar atualizados);
   sem internet, mostra /offline. */
const VERSAO = 'cv-v1';
const ESTATICOS = [
  '/offline',
  '/css/tailwind.css',
  '/js/site.js',
  '/js/mascaras.js',
  '/lib/jquery/dist/jquery.min.js',
  '/icons/icon-192.png',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ESTATICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Navegação: rede primeiro, página offline se cair.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/offline')));
    return;
  }

  // CSS, JS, imagens e libs: cache primeiro, atualiza em segundo plano.
  if (/\.(css|js|png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.open(VERSAO).then(async (cache) => {
        const emCache = await cache.match(req);
        const daRede = fetch(req).then((resp) => {
          if (resp.ok) cache.put(req, resp.clone());
          return resp;
        }).catch(() => emCache);
        return emCache || daRede;
      })
    );
  }
});
