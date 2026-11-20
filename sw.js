/*  MIZPA app · Service worker
 *  Guarda la app en el celular para que abra sin internet.
 *  Las pantallas del sistema se guardan aparte ("mizpa-app") y se actualizan solas desde el servidor.
 */
var V = 'mizpa-shell-v1';
var SHELL = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
var EXT = [
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
  'https://fonts.googleapis.com/icon?family=Material+Icons+Round'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) {
    return c.addAll(SHELL).then(function () {
      return Promise.all(EXT.map(function (u) { return fetch(u, { mode: 'no-cors' }).then(function (r) { return c.put(u, r); }).catch(function () {}); }));
    });
  }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('mizpa-shell-') === 0 && k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u = new URL(req.url);
  // El servidor (Apps Script) siempre va directo a internet
  if (/script\.google|googleusercontent|\/exec$/.test(u.hostname + u.pathname)) return;
  var mismo = u.origin === self.location.origin;
  e.respondWith(caches.open(V).then(function (c) {
    return c.match(req, { ignoreSearch: mismo }).then(function (guardado) {
      var red = fetch(req).then(function (r) {
        if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone());
        return r;
      }).catch(function () { return guardado || (req.mode === 'navigate' ? c.match('index.html') : undefined); });
      return guardado || red;   // primero lo guardado (abre sin señal); se actualiza por detrás
    });
  }));
});
