import type { Medicine, RestockItem } from '@/types';

export function computeRestockItems(medicines: Medicine[]): RestockItem[] {
  return medicines
    .filter((med) => med.currentStock <= med.reorderThreshold)
    .map((med) => ({
      medicineId: med.id,
      medicineName: med.name,
      currentStock: med.currentStock,
      reorderQuantity: med.reorderQuantity,
      unit: med.unit,
    }));
}
