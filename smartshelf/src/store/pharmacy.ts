import { create } from 'zustand';
import { idb } from '@/lib/idb';
import type { Medicine, Sale, StockAlert } from '@/types';
import { computeAlerts, computeHealthScore } from '@/lib/risk-engine';
import { syncMedicinesToServer } from '@/lib/sync';

function getToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return localStorage.getItem('token') ?? undefined;
}

interface PharmacyStore {
  medicines: Medicine[];
  sales: Sale[];
  alerts: StockAlert[];
  healthScore: number;
  isLoaded: boolean;
  loadData: () => Promise<void>;
  recordSale: (medicineId: string, quantity?: number) => Promise<void>;
  addMedicine: (medicine: Medicine) => Promise<void>;
  updateMedicine: (medicine: Medicine) => Promise<void>;
  deleteMedicine: (id: string) => Promise<void>;
}

export const usePharmacyStore = create<PharmacyStore>((set, get) => ({
  medicines: [],
  sales: [],
  alerts: [],
  healthScore: 100,
  isLoaded: false,

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
    const sale: Sale = {
      id: crypto.randomUUID(),
      medicineId,
      quantity,
      soldAt: new Date().toISOString(),
      synced: false,
    };

    await idb.pendingSales.put(sale);

    const medicine = await idb.medicines.get(medicineId);
    if (!medicine) return;

    const updated: Medicine = {
      ...medicine,
      currentStock: Math.max(0, medicine.currentStock - quantity),
      updatedAt: new Date().toISOString(),
    };
    await idb.medicines.put(updated);

    await get().loadData();
  },

  addMedicine: async (medicine: Medicine) => {
    await idb.medicines.put(medicine);
    await syncMedicinesToServer([medicine], getToken());
    await get().loadData();
  },

  updateMedicine: async (medicine: Medicine) => {
    await idb.medicines.put(medicine);
    await syncMedicinesToServer([medicine], getToken());
    await get().loadData();
  },

  deleteMedicine: async (id: string) => {
    await idb.medicines.delete(id);
    const token = getToken();
    if (token) {
      fetch(`/api/medicines/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    await get().loadData();
  },
}));
