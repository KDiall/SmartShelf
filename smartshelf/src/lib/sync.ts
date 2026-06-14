import { idb } from './idb';
import type { Medicine, Sale } from '@/types';

function authHeaders(token?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

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

export async function syncPendingSales(authToken?: string): Promise<void> {
  const pending = await idb.pendingSales.toArray();
  if (pending.length === 0) return;

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: authHeaders(authToken),
    body: JSON.stringify({ sales: pending }),
  });

  if (!res.ok) return;

  const synced = pending.map((s) => ({ ...s, synced: true }));
  await idb.transaction('rw', idb.sales, idb.pendingSales, async () => {
    await idb.sales.bulkPut(synced);
    await idb.pendingSales.bulkDelete(pending.map((s) => s.id));
  });
}

export async function syncMedicinesToServer(
  medicines: Medicine[],
  authToken?: string
): Promise<void> {
  const res = await fetch('/api/medicines', {
    method: 'POST',
    headers: authHeaders(authToken),
    body: JSON.stringify({ medicines }),
  });

  if (!res.ok) {
    console.error('Failed to sync medicines');
  }
}
