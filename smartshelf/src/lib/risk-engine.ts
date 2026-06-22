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
    if (daysToExpiry <= EXPIRY_WARNING_DAYS) {
      alerts.push({
        medicineId: med.id,
        medicineName: med.name,
        type: 'expiry',
        severity: daysToExpiry <= 30 ? 'critical' : 'warning',
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
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const totalIssues = criticalCount + warningCount;

  if (totalIssues === 0) return 100;

  // Each critical alert costs ~20 points, each warning costs ~8.
  // Cap at 0 so the score is always between 0–100.
  const score = Math.max(0, 100 - criticalCount * 20 - warningCount * 8);

  // With many medicines, a single critical alert shouldn't tank the score.
  // The formula above already captures that naturally.
  return score;
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
