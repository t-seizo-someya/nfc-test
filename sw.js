// 棚卸・払出し：圏外でも画面を開き直せるようにする保管係
// 方針：電波があれば常に最新の画面を取得し、取得できないとき（圏外・遅い）だけ保存済みの画面を出す
const CACHE = 'tanaoroshi-v3';
const ASSETS = ['./', './index.html'];
const TIMEOUT_MS = 3000;   // 電波が弱いとき、これ以上待たずに保存済みの画面を出す

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fetchWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then(
      res => { clearTimeout(t); resolve(res); },
      err => { clearTimeout(t); reject(err); }
    );
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetchWithTimeout(req, TIMEOUT_MS)
      .then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true })
          .then(hit => hit || caches.match('./index.html'))
      )
  );
});
