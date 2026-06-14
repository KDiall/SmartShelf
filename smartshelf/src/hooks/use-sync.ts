'use client';
import { useEffect } from 'react';
import { useOnline } from './use-online';
import { syncPendingSales } from '@/lib/sync';
import { usePharmacyStore } from '@/store/pharmacy';

export function useSync() {
  const online = useOnline();
  const loadData = usePharmacyStore((s) => s.loadData);

  useEffect(() => {
    if (!online) {
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((reg) => {
          (reg as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-pending-sales').catch(() => {});
        });
      }
      return;
    }
    syncPendingSales().then(() => loadData());
  }, [online, loadData]);
}
