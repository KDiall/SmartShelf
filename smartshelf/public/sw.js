const CACHE_VERSION = 'v6';
const STATIC_CACHE = `smartshelf-static-${CACHE_VERSION}`;
const API_CACHE = `smartshelf-api-${CACHE_VERSION}`;
const ASSET_CACHE = `smartshelf-assets-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/login',
  '/verify',
  '/stock',
  '/orders',
  '/restock',
  '/risks',
  '/more',
  '/settings',
  '/medicines',
  '/bulk-sale',
  '/offline',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('SW: precache failed for some URLs', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (request.method !== 'GET') {
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(networkOnly(request));
    }
    return;
  }

  if (url.pathname === '/api/auth/send-otp' || url.pathname === '/api/auth/verify-otp') {
    event.respondWith(networkOnly(request));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    event.respondWith(networkFirstWithCache(request, ASSET_CACHE));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithCache(request, STATIC_CACHE));
    return;
  }

  event.respondWith(networkFirstWithCache(request, STATIC_CACHE));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return caches.match('/offline');
    }
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-sales') {
    event.waitUntil(syncPendingSales());
  }
});

async function syncPendingSales() {
  try {
    const dbRequest = indexedDB.open('SmartShelfDB');
    const db = await new Promise((resolve, reject) => {
      dbRequest.onsuccess = () => resolve(dbRequest.result);
      dbRequest.onerror = () => reject(dbRequest.error);
    });

    const tx = db.transaction('pendingSales', 'readonly');
    const store = tx.objectStore('pendingSales');
    const pending = await new Promise((resolve) => {
      const items = [];
      store.openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          items.push(cursor.value);
          cursor.continue();
        } else {
          resolve(items);
        }
      };
    });

    if (pending.length === 0) return;

    const token = await getTokenFromClients();

    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sales: pending }),
    });

    if (res.ok) {
      const writeTx = db.transaction('pendingSales', 'readwrite');
      const writeStore = writeTx.objectStore('pendingSales');
      for (const sale of pending) {
        writeStore.delete(sale.id);
      }
      const salesStore = db.transaction('sales', 'readwrite').objectStore('sales');
      for (const sale of pending) {
        salesStore.put({ ...sale, synced: true });
      }
    }
  } catch (err) {
    console.error('Background sync failed:', err);
  }
}

async function getTokenFromClients() {
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    if (client.type === 'window') {
      const channel = new MessageChannel();
      return new Promise((resolve) => {
        channel.port1.onmessage = (e) => resolve(e.data);
        client.postMessage({ type: 'GET_TOKEN' }, [channel.port2]);
      });
    }
  }
  return '';
}
