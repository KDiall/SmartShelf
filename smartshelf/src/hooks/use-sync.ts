'use client';
import { useEffect } from 'react';
import { useOnline } from './use-online';
import { syncPendingSales } from '@/lib/sync';
import { usePharmacyStore } from '@/store/pharmacy';

export function useSync() {
  const online = useOnline();
  const loadData = usePharmacyStore((s) => s.loadData);

  useEffect(() => {
    if (!online) return;
    syncPendingSales().then(() => loadData());
  }, [online, loadData]);
}
