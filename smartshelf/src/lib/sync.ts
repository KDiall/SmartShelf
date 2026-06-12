import { idb } from './idb';
import type { Medicine, Sale } from '@/types';

export async function bootstrapFromServer(userId?: string): Promise<void> {
  const count = await idb.medicines.count();
  if (count > 0) return;

  const url = userId ? `/api/medicines?userId=${userId}` : '/api/medicines';
  const [medRes, salesRes] = await Promise.all([
    fetch(url),
    fetch('/api/sales'),
  ]);

  if (medRes.ok) {
    const medicines: Medicine[] = await medRes.json();
    await idb.medicines.bulkPut(medicines);
  }

  if (salesRes.ok) {
    const sales: Sale[] = await salesRes.json();
    await idb.sales.bulkPut(sales);
  }
}

export async function syncPendingSales(): Promise<void> {
  const pending = await idb.pendingSales.toArray();
  if (pending.length === 0) return;

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  medicines: Medicine[]
): Promise<void> {
  const res = await fetch('/api/medicines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medicines }),
  });

  if (!res.ok) {
    console.error('Failed to sync medicines');
  }
}
