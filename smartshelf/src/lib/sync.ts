import { idb } from './idb';
import type { Medicine, Sale } from '@/types';

function authHeaders(token?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
  throw new Error('retry failed');
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

export async function bootstrapFromServer(userId?: string, authToken?: string): Promise<void> {
  const url = userId ? `/api/medicines?userId=${userId}` : '/api/medicines';
  const headers = authHeaders(authToken);
  const [medRes, salesRes] = await Promise.all([
    fetch(url, { headers }),
    fetch('/api/sales', { headers }),
  ]);

  if (medRes.ok) {
    const medicines: Medicine[] = await medRes.json();
    if (medicines.length > 0) {
      await idb.medicines.bulkPut(medicines);
    }
  }

  if (salesRes.ok) {
    const sales: Sale[] = await salesRes.json();
    if (sales.length > 0) {
      await idb.sales.bulkPut(sales);
    }
  }
}

export async function syncPendingSales(authToken?: string): Promise<boolean> {
  const pending = await idb.pendingSales.toArray();
  if (pending.length === 0) return true;

  try {
    const res = await retry(() =>
      fetch('/api/sync', {
        method: 'POST',
        headers: authHeaders(authToken),
        body: JSON.stringify({ sales: pending }),
      })
    );

    if (!res.ok) return false;

    const synced = pending.map((s) => ({ ...s, synced: true }));
    await idb.transaction('rw', idb.sales, idb.pendingSales, async () => {
      await idb.sales.bulkPut(synced);
      await idb.pendingSales.bulkDelete(pending.map((s) => s.id));
    });
    return true;
  } catch {
    return false;
  }
}

export async function syncMedicinesToServer(
  medicines: Medicine[],
  authToken?: string
): Promise<boolean> {
  try {
    const res = await retry(() =>
      fetch('/api/medicines', {
        method: 'POST',
        headers: authHeaders(authToken),
        body: JSON.stringify({ medicines }),
      })
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncAll(authToken?: string): Promise<boolean> {
  return syncPendingSales(authToken);
}
