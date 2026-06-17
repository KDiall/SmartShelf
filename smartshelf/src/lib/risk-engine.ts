import { differenceInDays, subDays } from 'date-fns';
import type { Medicine, Sale, StockAlert } from '@/types';

const EXPIRY_WARNING_DAYS = 90;
const LOW_STOCK_MULTIPLIER = 2;

export function computeAlerts(
  medicines: Medicine[],
  sales: Sale[]
): StockAlert[] {
  const alerts: StockAlert[] = [];
  const today = new Date();
  const sevenDaysAgo = subDays(today, 7);

  for (const med of medicines) {
    const daysToExpiry = differenceInDays(
      new Date(med.expiryDate),
      today
    );
    if (
      daysToExpiry <= EXPIRY_WARNING_DAYS &&
      daysToExpiry > 0 &&
      med.currentStock > 0
    ) {
      alerts.push({
        medicineId: med.id,
        medicineName: med.name,
        type: 'expiry',
        severity: daysToExpiry <= 0 ? 'critical' : daysToExpiry <= 30 ? 'critical' : 'warning',
        daysRemaining: daysToExpiry,
        currentStock: med.currentStock,
        estimatedLossLeones: med.currentStock * med.costPerUnit,
      });
    }

    if (med.currentStock <= med.reorderThreshold) {
      const recentSales = sales.filter(
        (s) =>
          s.medicineId === med.id &&
          new Date(s.soldAt) >= sevenDaysAgo
      );
      const totalSoldLast7Days = recentSales.reduce(
        (sum, sale) => sum + sale.quantity,
        0
      );
      const avgDailySales = Math.max(totalSoldLast7Days / 7, 0.5);
      const daysRemaining = Math.floor(med.currentStock / avgDailySales);

      alerts.push({
        medicineId: med.id,
        medicineName: med.name,
        type: 'stockout',
        severity:
          med.currentStock === 0 || daysRemaining <= 3
            ? 'critical'
            : 'warning',
        daysRemaining,
        currentStock: med.currentStock,
      });
    }
  }

  return alerts.sort((a, b) => {
    if (a.severity !== b.severity)
      return a.severity === 'critical' ? -1 : 1;
    return a.daysRemaining - b.daysRemaining;
  });
}

export function computeHealthScore(alerts: StockAlert[]): number {
  let score = 100;
  for (const alert of alerts) {
    if (alert.severity === 'critical') score -= 15;
    else if (alert.severity === 'warning') score -= 5;
  }
  return Math.max(0, score);
}

export function getStockStatus(
  stock: number,
  threshold: number
): 'ok' | 'low' | 'critical' | 'out' {
  if (stock === 0) return 'out';
  if (stock <= threshold) return 'critical';
  if (stock <= threshold * LOW_STOCK_MULTIPLIER) return 'low';
  return 'ok';
}
