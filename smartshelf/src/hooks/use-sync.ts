'use client';
import { useEffect } from 'react';
import { useOnline } from './use-online';
import { syncPendingSales, bootstrapFromServer } from '@/lib/sync';
import { usePharmacyStore } from '@/store/pharmacy';
import { useAuthStore } from '@/store/auth';

export function useSync() {
  const online = useOnline();
  const loadData = usePharmacyStore((s) => s.loadData);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (online && token) {
      bootstrapFromServer(user?.id, token, user?.pharmacyId).then(() => {
        syncPendingSales(token).then(() => loadData());
      });
    } else if (online) {
      // Not authenticated yet — no point fetching server data without a token.
      loadData();
    } else {
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((reg) => {
          (reg as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-pending-sales').catch(() => {});
        });
      }
    }
  }, [online, loadData, user?.id, user?.pharmacyId, token]);
}
