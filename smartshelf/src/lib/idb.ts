import Dexie, { type Table } from 'dexie';
import type { Medicine, Sale } from '@/types';

export class SmartShelfDB extends Dexie {
  medicines!: Table<Medicine>;
  sales!: Table<Sale>;
  pendingSales!: Table<Sale>;

  constructor() {
    super('SmartShelfDB');
    this.version(1).stores({
      medicines: 'id, name, currentStock, expiryDate, isBig5',
      sales: 'id, medicineId, soldAt, synced',
      pendingSales: 'id, medicineId, soldAt',
    });
  }
}

export const idb = new SmartShelfDB();
