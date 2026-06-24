import { create } from 'zustand';
import { idb } from '@/lib/idb';
import type { Medicine, Sale, StockAlert } from '@/types';
import { computeAlerts, computeHealthScore } from '@/lib/risk-engine';
import { syncMedicinesToServer, syncPendingSales, type SyncStatus } from '@/lib/sync';

function getToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return localStorage.getItem('token') ?? undefined;
}

function getUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return undefined;
    return (JSON.parse(raw) as { id: string }).id;
  } catch {
    return undefined;
  }
}

function getPharmacyId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return undefined;
    return (JSON.parse(raw) as { pharmacyId?: string }).pharmacyId;
  } catch {
    return undefined;
  }
}

interface PharmacyStore {
  medicines: Medicine[];
  sales: Sale[];
  alerts: StockAlert[];
  healthScore: number;
  isLoaded: boolean;
  isOnline: boolean;
  syncStatus: SyncStatus;
  loadData: () => Promise<void>;
  recordSale: (medicineId: string, quantity?: number) => Promise<void>;
  recordBulkSales: (items: { medicineId: string; quantity: number }[]) => Promise<void>;
  addMedicine: (medicine: Medicine) => Promise<void>;
  updateMedicine: (medicine: Medicine) => Promise<void>;
  deleteMedicine: (id: string) => Promise<void>;
  retrySync: () => Promise<void>;
}

export const usePharmacyStore = create<PharmacyStore>((set, get) => ({
  medicines: [],
  sales: [],
  alerts: [],
  healthScore: 100,
  isLoaded: false,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  syncStatus: 'idle',

  loadData: async () => {
    const medicines = await idb.medicines.toArray();
    const sales = await idb.sales.toArray();
    const pendingSales = await idb.pendingSales.toArray();

    const allSales = [...sales, ...pendingSales];
    const alerts = computeAlerts(medicines, allSales);
    const healthScore = computeHealthScore(alerts);

    set({ medicines, sales: allSales, alerts, healthScore, isLoaded: true });
  },

  recordSale: async (medicineId, quantity = 1) => {
    const medicine = await idb.medicines.get(medicineId);
    if (!medicine) throw new Error('Medicine not found');
    if (quantity > medicine.currentStock) {
      throw new Error(
        `Not enough stock for ${medicine.name}: ${quantity} requested, ${medicine.currentStock} available.`
      );
    }

    const sale: Sale = {
      id: crypto.randomUUID(),
      medicineId,
      quantity,
      soldAt: new Date().toISOString(),
      synced: false,
      userId: getUserId(),
      pharmacyId: getPharmacyId(),
    };

    await idb.pendingSales.put(sale);

    const updated: Medicine = {
      ...medicine,
      currentStock: medicine.currentStock - quantity,
      updatedAt: new Date().toISOString(),
    };
    if (updated.isBig5 && updated.currentStock <= 0) {
      updated.isBig5 = false;
    }
    await idb.medicines.put(updated);

    await get().loadData();

    if (navigator.onLine) {
      get().retrySync();
    }
  },

  recordBulkSales: async (items) => {
    await idb.transaction('rw', idb.pendingSales, idb.medicines, async () => {
      for (const { medicineId, quantity } of items) {
        const medicine = await idb.medicines.get(medicineId);
        if (!medicine) throw new Error('Medicine not found');
        if (quantity > medicine.currentStock) {
          throw new Error(
            `Not enough stock for ${medicine.name}: ${quantity} requested, ${medicine.currentStock} available.`
          );
        }
      }

      for (const { medicineId, quantity } of items) {
        const sale: Sale = {
          id: crypto.randomUUID(),
          medicineId,
          quantity,
          soldAt: new Date().toISOString(),
          synced: false,
          userId: getUserId(),
          pharmacyId: getPharmacyId(),
        };
        await idb.pendingSales.put(sale);

        const medicine = await idb.medicines.get(medicineId);
        if (medicine) {
          const updated: Medicine = {
            ...medicine,
            currentStock: medicine.currentStock - quantity,
            updatedAt: new Date().toISOString(),
          };
          if (updated.isBig5 && updated.currentStock <= 0) {
            updated.isBig5 = false;
          }
          await idb.medicines.put(updated);
        }
      }
    });

    await get().loadData();

    if (navigator.onLine) {
      get().retrySync();
    }
  },

  addMedicine: async (medicine: Medicine) => {
    await idb.medicines.put(medicine);
    const token = getToken();
    if (token && navigator.onLine) {
      await syncMedicinesToServer([medicine], token);
    }
    await get().loadData();
  },

  updateMedicine: async (medicine: Medicine) => {
    const updated = { ...medicine };
    if (updated.isBig5 && updated.currentStock <= 0) {
      updated.isBig5 = false;
    }
    await idb.medicines.put(updated);
    const token = getToken();
    if (token && navigator.onLine) {
      await syncMedicinesToServer([updated], token);
    }
    await get().loadData();
  },

  deleteMedicine: async (id: string) => {
    await idb.medicines.delete(id);
    const token = getToken();
    if (token && navigator.onLine) {
      fetch(`/api/medicines/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    await get().loadData();
  },

  retrySync: async () => {
    const token = getToken();
    if (!token || !navigator.onLine) return;
    set({ syncStatus: 'syncing' });
    const ok = await syncPendingSales(token);
    set({ syncStatus: ok ? 'success' : 'error' });
    setTimeout(() => {
      if (get().syncStatus !== 'syncing') set({ syncStatus: 'idle' });
    }, 3000);
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    usePharmacyStore.setState({ isOnline: true });
  });
  window.addEventListener('offline', () => {
    usePharmacyStore.setState({ isOnline: false });
  });
}
