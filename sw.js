// WhatsApp (veya başka bir uygulamadan) "Paylaş" ile gelen irsaliye dosyalarını yakalar ve
// tarayıcı deposuna (IndexedDB) kaydeder. Program açılınca bu dosyaları "Gelen irsaliyeler" ekranında gösterir.
const DB_NAME = 'cari-hesap-irsaliye-gelen';

function openDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains('files')) r.result.createObjectStore('files', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function handleShare(request) {
  let saved = 0;
  try {
    const fd = await request.formData();
    const files = fd.getAll('files').filter(f => f && typeof f === 'object' && 'size' in f && f.size > 0);
    if (files.length) {
      const db = await openDb();
      await new Promise((res, rej) => {
        const tx = db.transaction('files', 'readwrite');
        const st = tx.objectStore('files');
        files.forEach((f, i) => {
          st.put({
            id: 'sh_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 7),
            name: f.name || 'irsaliye',
            type: f.type || '',
            blob: f,
            sharedAt: Date.now(),
            irsNo: ''
          });
        });
        tx.oncomplete = () => { db.close(); res(); };
        tx.onerror = () => { db.close(); rej(tx.error); };
      });
      saved = files.length;
    }
  } catch (e) { /* kayıt başarısızsa yine de uygulamaya yönlendir */ }
  return Response.redirect(new URL('./?irs-shared=' + saved, self.registration.scope).href, 303);
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method === 'POST' && u.pathname.endsWith('/share-target')) {
    e.respondWith(handleShare(e.request));
  }
});
